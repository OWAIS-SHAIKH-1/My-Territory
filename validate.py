def check_balance(filename, open_char, close_char):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    count = 0
    errors = 0
    for idx, char in enumerate(content):
        if char == open_char:
            count += 1
        elif char == close_char:
            count -= 1
            if count < 0:
                print(f"Error: Unbalanced '{close_char}' in {filename} at character position {idx}")
                errors += 1
                count = 0
    if count > 0:
        print(f"Error: {count} unclosed '{open_char}' in {filename}")
        errors += 1
    return errors == 0

css_ok = check_balance('style.css', '{', '}')
js_ok = check_balance('app.js', '{', '}')

print(f"style.css balance: {'OK' if css_ok else 'FAILED'}")
print(f"app.js balance: {'OK' if js_ok else 'FAILED'}")
