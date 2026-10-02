with open('index.html', 'r') as f:
    lines = f.readlines()

with open('scratch/sidebar_updated.html', 'r') as f:
    new_sidebar = f.read()

# Replace lines 132 to 291 (0-indexed 132 to 291 is 133 to 292 in 1-indexed)
# Wait, let's just find the start and end indices dynamically to be safe.
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '<aside id="sidebar"' in line:
        start_idx = i
    if '</aside>' in line and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    del lines[start_idx:end_idx+1]
    lines.insert(start_idx, new_sidebar + '\n')
    
    with open('index.html', 'w') as f:
        f.writelines(lines)
    print("Successfully replaced sidebar.")
else:
    print("Could not find sidebar tags.")
