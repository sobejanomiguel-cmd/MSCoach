import re

with open('app.js', 'r') as f:
    content = f.read()

old_grouping = """                    const groupingRules = [
                        { key: 'DC', list: ['DC', 'DCD', 'DCZ'] },
                        { key: 'MC', list: ['MC', 'MCD', 'MCZ', 'MVD', 'MVZ', 'MBD', 'MBZ'] },
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

content = content.replace(old_grouping.strip().replace('                    ', '                '), new_grouping.strip().replace('                    ', '                '))

with open('app.js', 'w') as f:
    f.write(content)

print("Done updating positions 2")
