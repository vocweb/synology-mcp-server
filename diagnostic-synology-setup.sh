#!/bin/bash

# Diagnostic script to verify Synology NAS setup for synology-office-mcp
# Run this via SSH on your NAS: ssh admin@your.nas < diagnostic-synology-setup.sh

echo "=== Synology Office MCP Diagnostic Report ==="
echo "Generated: $(date)"
echo ""

# 1. DSM Version Check
echo "1. DSM Version:"
if [ -f /etc.defaults/VERSION ]; then
    cat /etc.defaults/VERSION | grep -E "productversion=|buildnumber="
    BUILD=$(grep buildnumber= /etc.defaults/VERSION | cut -d= -f2)
    if [ "$BUILD" -ge 72806 ]; then
        echo "✓ DSM version >= 7.2.2 build 72806 (OK)"
    else
        echo "✗ DSM version < 72806 (REQUIRES UPDATE)"
    fi
else
    echo "✗ Cannot find /etc.defaults/VERSION"
fi
echo ""

# 2. Synology Drive package check
echo "2. Synology Drive Server:"
if synopkg is-installed SynologyDrive >/dev/null 2>&1; then
    STATUS=$(synopkg status SynologyDrive 2>/dev/null)
    echo "✓ Synology Drive installed"
    echo "  Status: $STATUS"
    # Try to get version
    if [ -d "/var/packages/SynologyDrive" ]; then
        ls -la /var/packages/SynologyDrive/target/etc/ 2>/dev/null | head -5
    fi
else
    echo "✗ Synology Drive NOT installed (REQUIRED)"
fi
echo ""

# 3. Synology Office package check (CRITICAL)
echo "3. Synology Office (CRITICAL for Spreadsheet):"
if synopkg is-installed SynologyOffice >/dev/null 2>&1; then
    STATUS=$(synopkg status SynologyOffice 2>/dev/null)
    echo "✓ Synology Office installed"
    echo "  Status: $STATUS"
    # Check if we can query the API
    echo "  Attempting API query (SYNO.Office.Sheet.Snapshot)..."
else
    echo "✗ Synology Office NOT installed (REQUIRED for spreadsheet_read_sheet)"
    echo "  → Install via Package Center → Search 'Synology Office'"
fi
echo ""

# 4. MailPlus Server check (optional, for email tools)
echo "4. MailPlus Server (optional, for email tools):"
if synopkg is-installed MailPlus >/dev/null 2>&1; then
    STATUS=$(synopkg status MailPlus 2>/dev/null)
    echo "✓ MailPlus installed"
    echo "  Status: $STATUS"
else
    echo "⊘ MailPlus NOT installed (optional - email tools won't work)"
fi
echo ""

# 5. Synology Calendar check (optional)
echo "5. Synology Calendar (optional, for calendar tools):"
if synopkg is-installed SynologyCalendar >/dev/null 2>&1; then
    STATUS=$(synopkg status SynologyCalendar 2>/dev/null)
    echo "✓ Synology Calendar installed"
    echo "  Status: $STATUS"
else
    echo "⊘ Synology Calendar NOT installed (optional - calendar tools won't work)"
fi
echo ""

# 6. Network test (try to reach entry.cgi)
echo "6. Network/API Test:"
API_URL="http://127.0.0.1:5000/webapi/entry.cgi?api=SYNO.API.Info&version=1&method=query"
if command -v curl >/dev/null 2>&1; then
    RESPONSE=$(curl -s -m 5 "$API_URL" || echo "TIMEOUT")
    if echo "$RESPONSE" | grep -q "success"; then
        echo "✓ API endpoint responding"
    else
        echo "✗ API endpoint not responding or error"
        echo "  Response: ${RESPONSE:0:100}"
    fi
else
    echo "⊘ curl not available, skipping network test"
fi
echo ""

echo "=== Summary ==="
echo "Required:"
echo "  • DSM 7.2.2 build 72806+"
echo "  • Synology Drive Server 3.5.2+"
echo "  • Synology Office 3.6.0+ ← CHECK THIS IF spreadsheet_read_sheet FAILS"
echo ""
echo "Optional:"
echo "  • MailPlus Server (for email tools)"
echo "  • Synology Calendar 2.5.3+ (for calendar tools)"
echo ""
