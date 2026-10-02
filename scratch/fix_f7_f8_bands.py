import re

with open('app.js', 'r') as f:
    content = f.read()

# 1. Any single CT in the middle was named CTD (at y: 50). We change it to CT.
content = content.replace("{ pos: 'CTD', x: 25, y: 50 }", "{ pos: 'CT', x: 25, y: 50 }") # F8_331, F8_322
content = content.replace("{ pos: 'CTD', x: 30, y: 50 }", "{ pos: 'CT', x: 30, y: 50 }") # F7_321, F7_132, F7_312

# 2. F7_231 has 2 CTs. Wide players are currently INT. The rule says if 2 CTs, wide players are ED and EI.
f7_231_old = """        'F7_231': {
            name: '2-3-1 (F7)', positions: [
                { pos: 'PT', x: 10, y: 50 }, { pos: 'CTD', x: 30, y: 65 }, { pos: 'CTI', x: 30, y: 35 },
                { pos: 'INT', x: 55, y: 85 }, { pos: 'MC', x: 55, y: 50 }, { pos: 'INT', x: 55, y: 15 }, { pos: 'DC', x: 90, y: 50 }
            ]
        },"""
f7_231_new = """        'F7_231': {
            name: '2-3-1 (F7)', positions: [
                { pos: 'PT', x: 10, y: 50 }, { pos: 'CTD', x: 30, y: 65 }, { pos: 'CTI', x: 30, y: 35 },
                { pos: 'ED', x: 55, y: 85 }, { pos: 'MC', x: 55, y: 50 }, { pos: 'EI', x: 55, y: 15 }, { pos: 'DC', x: 90, y: 50 }
            ]
        },"""
content = content.replace(f7_231_old, f7_231_new)

# 3. F7_132 has 1 CT. Wide players are currently ED and EI. The rule says if 1 CT, wide players are LTD and LTI.
f7_132_old = """        'F7_132': {
            name: '1-3-2 (F7)', positions: [
                { pos: 'PT', x: 10, y: 50 }, { pos: 'CT', x: 30, y: 50 },
                { pos: 'ED', x: 55, y: 85 }, { pos: 'MC', x: 55, y: 50 }, { pos: 'EI', x: 55, y: 15 }, { pos: 'DC', x: 90, y: 65 }, { pos: 'DC', x: 90, y: 35 }
            ]
        },"""
f7_132_new = """        'F7_132': {
            name: '1-3-2 (F7)', positions: [
                { pos: 'PT', x: 10, y: 50 }, { pos: 'CT', x: 30, y: 50 },
                { pos: 'LTD', x: 55, y: 85 }, { pos: 'MC', x: 55, y: 50 }, { pos: 'LTI', x: 55, y: 15 }, { pos: 'DC', x: 90, y: 65 }, { pos: 'DC', x: 90, y: 35 }
            ]
        },"""
content = content.replace(f7_132_old, f7_132_new)

with open('app.js', 'w') as f:
    f.write(content)

print("Done")
