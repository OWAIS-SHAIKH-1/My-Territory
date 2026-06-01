with open('app.js', 'r', encoding='utf-8') as f:
    code = f.read()

stack = []
mismatches = []
line_num = 1
col_num = 1

for idx, char in enumerate(code):
    if char == '\n':
        line_num += 1
        col_num = 1
        continue
    
    if char in ['{', '[', '(']:
        stack.append((char, line_num, col_num))
    elif char in ['}', ']', ')']:
        if not stack:
            mismatches.append(f"Extra closing '{char}' at line {line_num}, col {col_num}")
        else:
            top_char, top_line, top_col = stack.pop()
            if (char == '}' and top_char != '{') or \
               (char == ']' and top_char != '[') or \
               (char == ')' and top_char != '('):
                mismatches.append(f"Mismatched closing '{char}' at line {line_num}, col {col_num} (matches '{top_char}' at line {top_line}, col {top_col})")
    col_num += 1

if stack:
    for char, line, col in stack:
        mismatches.append(f"Unclosed '{char}' at line {line}, col {col}")

if mismatches:
    print(f"FAILED: {len(mismatches)} bracket mismatches found:")
    for m in mismatches[:10]:
        print(m)
else:
    print("SUCCESS: Brackets and braces are perfectly balanced in app.js!")
