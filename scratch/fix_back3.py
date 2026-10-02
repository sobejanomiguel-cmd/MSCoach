import re

with open('app.js', 'r') as f:
    content = f.read()

# Fix F11_352
old_352 = "{ pos: 'LTD', x: 25, y: 75 }, { pos: 'CT', x: 25, y: 50 }, { pos: 'LTI', x: 25, y: 25 }"
new_352 = "{ pos: 'CTD', x: 25, y: 75 }, { pos: 'CT', x: 25, y: 50 }, { pos: 'CTI', x: 25, y: 25 }"
content = content.replace(old_352, new_352)

# Fix F11_541 (it had CTD, CTI, CTD)
old_541 = "{ pos: 'LTD', x: 25, y: 90 }, { pos: 'CTD', x: 25, y: 70 }, { pos: 'CTI', x: 25, y: 50 }, { pos: 'CTD', x: 25, y: 30 }, { pos: 'LTI', x: 25, y: 10 }"
new_541 = "{ pos: 'LTD', x: 25, y: 90 }, { pos: 'CTD', x: 25, y: 70 }, { pos: 'CT', x: 25, y: 50 }, { pos: 'CTI', x: 25, y: 30 }, { pos: 'LTI', x: 25, y: 10 }"
content = content.replace(old_541, new_541)

with open('app.js', 'w') as f:
    f.write(content)
