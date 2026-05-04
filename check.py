def check_js_syntax(filename):
    with open(filename, 'r') as f:
        code = f.read()
    
    stack = []
    line = 1
    col = 1
    
    in_single_quote = False
    in_double_quote = False
    in_backtick = False
    in_comment = False
    in_block_comment = False
    escaped = False
    
    for i, c in enumerate(code):
        if c == '\n':
            line += 1
            col = 1
            in_comment = False
        else:
            col += 1
            
        if escaped:
            escaped = False
            continue
            
        if c == '\\':
            escaped = True
            continue
            
        if in_comment:
            continue
            
        if in_block_comment:
            if c == '*' and i + 1 < len(code) and code[i+1] == '/':
                in_block_comment = False
            continue
            
        # Ignore strings completely, but let's handle escaping correctly
        if in_single_quote:
            if c == "'": in_single_quote = False
            continue
        if in_double_quote:
            if c == '"': in_double_quote = False
            continue
        if in_backtick:
            if c == '`': in_backtick = False
            continue
            
        if c == '/' and i + 1 < len(code) and code[i+1] == '/':
            in_comment = True
            continue
        if c == '/' and i + 1 < len(code) and code[i+1] == '*':
            in_block_comment = True
            continue
            
        if c == "'":
            in_single_quote = True
            continue
        if c == '"':
            in_double_quote = True
            continue
        if c == '`':
            in_backtick = True
            continue
            
        if c in '({[':
            stack.append((c, line, col))
        elif c in ')}]':
            if not stack:
                print(f"Excess closing token '{c}' at line {line}, col {col}")
                return
            top, l, cl = stack[-1]
            if (c == ')' and top == '(') or (c == '}' and top == '{') or (c == ']' and top == '['):
                stack.pop()
            else:
                # Let's not abort immediately, but continue to see where the mismatch is.
                pass

    if stack:
        print(f"Unclosed tokens left in stack: {len(stack)}")
        # Print only the first 5 and last 5
        for s in stack[:5]:
            print(f"  Token '{s[0]}' from line {s[1]}, col {s[2]}")
        print("...")
        for s in stack[-5:]:
            print(f"  Token '{s[0]}' from line {s[1]}, col {s[2]}")
    else:
        print("All parentheses and braces are balanced perfectly!")

check_js_syntax('app.js')
