import re

with open('app.js', 'r') as f:
    content = f.read()

old_display_grouping = """            const groupingRules = [
                { key: 'DC', list: ['DC', 'DCD', 'DCZ', 'DFC', 'CD', 'CZ'] },
                { key: 'MC', list: ['MC', 'MCD', 'MCZ', 'MVD', 'MVZ', 'MBD', 'MBZ'] },
                { key: 'MP', list: ['MP', 'MPD', 'MPZ'] },
                { key: 'AC', list: ['AC', 'ACD', 'ACZ'] }
            ];"""

new_display_grouping = """            const groupingRules = [
                { key: 'CT', list: ['CT', 'CTD', 'CTI'] }
            ];"""

content = content.replace(old_display_grouping, new_display_grouping)

with open('app.js', 'w') as f:
    f.write(content)

print("Done updating positions 3")
