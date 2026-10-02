import re

with open('app.js', 'r') as f:
    content = f.read()

# Helper function to replace matches
def replace_formations(name, old, new):
    global content
    if old in content:
        content = content.replace(old, new)
        print(f"Updated {name}")
    else:
        print(f"Could not find exact match for {name}")

# F11_433: 3 central midfielders. Currently MC, INT, INT. Change to MC, INT, MP.
old_433 = "{ pos: 'MC', x: 48, y: 50 }, { pos: 'INT', x: 65, y: 75 }, { pos: 'INT', x: 65, y: 25 }"
new_433 = "{ pos: 'MC', x: 48, y: 50 }, { pos: 'INT', x: 65, y: 75 }, { pos: 'MP', x: 65, y: 25 }"
replace_formations("F11_433", old_433, new_433)

# F11_442: 2 central midfielders. Currently MC, MC. Change to MC, INT.
old_442 = "{ pos: 'ED', x: 55, y: 85 }, { pos: 'MC', x: 55, y: 60 }, { pos: 'MC', x: 55, y: 40 }, { pos: 'EI', x: 55, y: 15 }"
new_442 = "{ pos: 'ED', x: 55, y: 85 }, { pos: 'MC', x: 55, y: 60 }, { pos: 'INT', x: 55, y: 40 }, { pos: 'EI', x: 55, y: 15 }"
replace_formations("F11_442", old_442, new_442)

# F11_4231: 2 central defensive midfielders. Currently MC, MC. Change to MC, INT.
old_4231 = "{ pos: 'MC', x: 45, y: 65 }, { pos: 'MC', x: 45, y: 35 }"
new_4231 = "{ pos: 'MC', x: 45, y: 65 }, { pos: 'INT', x: 45, y: 35 }"
replace_formations("F11_4231", old_4231, new_4231)

# F11_352: 3 central midfielders (2 MC, 1 MP). Change the two MC to MC, INT. Total: MC, INT, MP.
old_352 = "{ pos: 'ED', x: 50, y: 90 }, { pos: 'MC', x: 50, y: 65 }, { pos: 'MC', x: 50, y: 35 }, { pos: 'EI', x: 50, y: 10 }, { pos: 'MP', x: 68, y: 50 }"
new_352 = "{ pos: 'ED', x: 50, y: 90 }, { pos: 'MC', x: 50, y: 65 }, { pos: 'INT', x: 50, y: 35 }, { pos: 'EI', x: 50, y: 10 }, { pos: 'MP', x: 68, y: 50 }"
replace_formations("F11_352", old_352, new_352)

# F11_541: 2 central midfielders. Currently MC, MC. Change to MC, INT.
old_541 = "{ pos: 'ED', x: 55, y: 80 }, { pos: 'MC', x: 55, y: 60 }, { pos: 'MC', x: 55, y: 40 }, { pos: 'EI', x: 55, y: 20 }"
new_541 = "{ pos: 'ED', x: 55, y: 80 }, { pos: 'MC', x: 55, y: 60 }, { pos: 'INT', x: 55, y: 40 }, { pos: 'EI', x: 55, y: 20 }"
replace_formations("F11_541", old_541, new_541)

# F11_4141: Currently 1 MC, 4 INTs. This is weird, I'll assume they meant ED, MC, INT, EI for the line of 4.
# Then the 3 central midfielders would be the pivot (MC) + the two in front (MC, INT) or (INT, MP).
# Let's make it: pivot = MC, front two = INT, MP. And wings = ED, EI.
old_4141 = "{ pos: 'MC', x: 45, y: 50 }, { pos: 'INT', x: 65, y: 80 }, { pos: 'INT', x: 65, y: 60 }, { pos: 'INT', x: 65, y: 40 }, { pos: 'INT', x: 65, y: 20 }"
new_4141 = "{ pos: 'MC', x: 45, y: 50 }, { pos: 'ED', x: 65, y: 85 }, { pos: 'INT', x: 65, y: 60 }, { pos: 'MP', x: 65, y: 40 }, { pos: 'EI', x: 65, y: 15 }"
replace_formations("F11_4141", old_4141, new_4141)

# F8_322: 2 central midfielders. Currently MC, MC. Change to MC, INT.
old_f8_322 = "{ pos: 'MC', x: 55, y: 65 }, { pos: 'MC', x: 55, y: 35 }"
new_f8_322 = "{ pos: 'MC', x: 55, y: 65 }, { pos: 'INT', x: 55, y: 35 }"
replace_formations("F8_322", old_f8_322, new_f8_322)

# F8_241: 2 central midfielders. Currently MC, MC. Change to MC, INT.
old_f8_241 = "{ pos: 'ED', x: 55, y: 90 }, { pos: 'MC', x: 55, y: 65 }, { pos: 'MC', x: 55, y: 35 }, { pos: 'EI', x: 55, y: 10 }"
new_f8_241 = "{ pos: 'ED', x: 55, y: 90 }, { pos: 'MC', x: 55, y: 65 }, { pos: 'INT', x: 55, y: 35 }, { pos: 'EI', x: 55, y: 10 }"
replace_formations("F8_241", old_f8_241, new_f8_241)

# F7_321: 2 central midfielders. Currently MC, MC. Change to MC, INT.
old_f7_321 = "{ pos: 'MC', x: 60, y: 65 }, { pos: 'MC', x: 60, y: 35 }"
new_f7_321 = "{ pos: 'MC', x: 60, y: 65 }, { pos: 'INT', x: 60, y: 35 }"
replace_formations("F7_321", old_f7_321, new_f7_321)

with open('app.js', 'w') as f:
    f.write(content)
