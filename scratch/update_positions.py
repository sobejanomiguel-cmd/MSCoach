import re

with open('app.js', 'r') as f:
    content = f.read()

# 1. Update PLAYER_POSITIONS
old_positions = "const PLAYER_POSITIONS = ['PO', 'DBD', 'DBZ', 'DCD', 'DCZ', 'MCD', 'MCZ', 'MVD', 'MVZ', 'MBD', 'MBZ', 'MPD', 'MPZ', 'ACD', 'ACZ'];"
new_positions = "const PLAYER_POSITIONS = ['PT', 'LTD', 'CTD', 'CT', 'CTI', 'LTI', 'MC', 'INT', 'MP', 'ED', 'EI', 'DC'];"
content = content.replace(old_positions, new_positions)

# 2. Update FORMATIONS
# We need to replace occurrences of old positions with new positions inside the FORMATIONS object.
# Be careful to only replace inside the pos: '...' strings.
replacements = [
    ("pos: 'PO'", "pos: 'PT'"),
    ("pos: 'DBD'", "pos: 'LTD'"),
    ("pos: 'DBZ'", "pos: 'LTI'"),
    ("pos: 'DCD'", "pos: 'CTD'"),
    ("pos: 'DCZ'", "pos: 'CTI'"),
    ("pos: 'MCD'", "pos: 'MC'"),
    ("pos: 'MCZ'", "pos: 'MC'"),
    ("pos: 'MVD'", "pos: 'INT'"),
    ("pos: 'MVZ'", "pos: 'INT'"),
    ("pos: 'MPD'", "pos: 'MP'"),
    ("pos: 'MPZ'", "pos: 'MP'"),
    ("pos: 'MBD'", "pos: 'ED'"),
    ("pos: 'MBZ'", "pos: 'EI'"),
    ("pos: 'ACD'", "pos: 'DC'"),
    ("pos: 'ACZ'", "pos: 'DC'")
]
# Since we only want to change them within FORMATIONS, let's find the block.
start_idx = content.find('const FORMATIONS = {')
end_idx = content.find('function renderTacticalPitchHtml', start_idx)

formations_block = content[start_idx:end_idx]
for old, new in replacements:
    formations_block = formations_block.replace(old, new)

content = content[:start_idx] + formations_block + content[end_idx:]

# 3. Update groupingRules and staticGroups in renderTacticalPitchHtml
old_grouping = """                    const groupingRules = [
                        { key: 'DC', list: ['DC', 'DCD', 'DCZ'] },
                        { key: 'MC', list: ['MC', 'MCD', 'MCZ'] },
                        { key: 'MP', list: ['MP', 'MPD', 'MPZ'] },
                        { key: 'AC', list: ['AC', 'ACD', 'ACZ'] }
                    ];
                    for (const rule of groupingRules) {
                        if (rule.list.includes(targetSlot)) {
                            const countInFormation = activeFormation.positions.filter(p => rule.list.includes(p.pos)).length;
                            if (countInFormation === 1) return rule.list.includes(pPos);
                        }
                    }
                    const staticGroups = {
                        'PO': ['PO', 'POR', 'GK', 'POD', 'POZ'],
                        'DBD': ['DBD', 'LD', 'CAD'],
                        'DBZ': ['DBZ', 'LI', 'CAI'],
                        'DCD': ['DCD', 'DFC', 'CD'],
                        'DCZ': ['DCZ', 'DFC', 'CZ']
                    };"""

new_grouping = """                    const groupingRules = [
                        { key: 'CT', list: ['CT', 'CTD', 'CTI'] }
                    ];
                    for (const rule of groupingRules) {
                        if (rule.list.includes(targetSlot)) {
                            const countInFormation = activeFormation.positions.filter(p => rule.list.includes(p.pos)).length;
                            if (countInFormation === 1) return rule.list.includes(pPos);
                        }
                    }
                    const staticGroups = {
                        'PT': ['PT', 'PO', 'POR', 'GK'],
                        'LTD': ['LTD', 'DBD', 'LD', 'CAD'],
                        'LTI': ['LTI', 'DBZ', 'LI', 'CAI'],
                        'CTD': ['CTD', 'DCD', 'DFC', 'CD', 'CT'],
                        'CTI': ['CTI', 'DCZ', 'DFC', 'CZ', 'CT'],
                        'CT': ['CT', 'CTD', 'CTI', 'DCD', 'DCZ', 'DC'],
                        'MC': ['MC', 'MCD', 'MCZ'],
                        'INT': ['INT', 'MVD', 'MVZ'],
                        'MP': ['MP', 'MPD', 'MPZ'],
                        'ED': ['ED', 'MBD'],
                        'EI': ['EI', 'MBZ'],
                        'DC': ['DC', 'ACD', 'ACZ', 'AC']
                    };"""

content = content.replace(old_grouping, new_grouping)

# 4. Update the grouping rules used for display text mapping at the bottom
old_display_grouping = """                    const groupingRules = [
                        { key: 'DC', list: ['DC', 'DCD', 'DCZ'] },
                        { key: 'MC', list: ['MC', 'MCD', 'MCZ'] },
                        { key: 'MP', list: ['MP', 'MPD', 'MPZ'] },
                        { key: 'AC', list: ['AC', 'ACD', 'ACZ'] }
                    ];"""

new_display_grouping = """                    const groupingRules = [
                        { key: 'CT', list: ['CT', 'CTD', 'CTI'] }
                    ];"""

content = content.replace(old_display_grouping, new_display_grouping)

# Let's also do a visual mapping for parsePosition so old positions render as new positions in tables/cards
old_parse = """    window.parsePosition = (pos) => {
        if (!pos) return [];
        return pos.split(',').map(p => p.trim()).filter(p => p);
    };"""

new_parse = """    window.parsePosition = (pos) => {
        if (!pos) return [];
        const mapping = {
            'PO': 'PT', 'DBD': 'LTD', 'DCD': 'CTD', 'DC': 'CT', 'DCZ': 'CTI', 'DBZ': 'LTI',
            'MCD': 'MC', 'MCZ': 'MC', 'MVD': 'INT', 'MVZ': 'INT', 'MPD': 'MP', 'MPZ': 'MP',
            'MBD': 'ED', 'MBZ': 'EI', 'ACD': 'DC', 'ACZ': 'DC', 'AC': 'DC'
        };
        return pos.split(',').map(p => {
            const trimmed = p.trim();
            return mapping[trimmed] || trimmed;
        }).filter(p => p);
    };"""

content = content.replace(old_parse, new_parse)

with open('app.js', 'w') as f:
    f.write(content)

print("Done updating positions")
