#!/bin/bash

echo "=== Context Usage Analysis ==="
echo

# Count files that would be included
echo "Source files (excluding build artifacts):"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.rs" -o -name "*.js" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/target/*" \
    -not -path "*/dist/*" | wc -l

echo
echo "Documentation files (key ones only):"
find . -name "*.md" \
    -not -path "*/node_modules/*" \
    -not -path "*/target/*" \
    -not -name "CHANGELOG.md" \
    -not -name "THIRD-PARTY*" | wc -l

echo
echo "Largest files:"
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/target/*" \
    -exec wc -c {} + | sort -nr | head -5

echo
echo "Estimated context size:"
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.rs" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/target/*" \
    -exec wc -c {} + | tail -1 | awk '{print "Total: " $1/1024 " KB"}'