import re

with open('app.js', 'r') as f:
    content = f.read()

# Let's print out the F11 formations that have 3 or 5 defenders.
for name in ["F11_352", "F11_541", "F7_321", "F7_312", "F8_331", "F8_322"]:
    idx = content.find(name)
    if idx != -1:
        end_idx = content.find("]", idx)
        print(content[idx:end_idx+1])
        print("---")
