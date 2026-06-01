with open('style.css', 'r', encoding='utf-8') as f:
    content = f.read()

open_braces = 0
close_braces = 0
errors = []

for idx, char in enumerate(content):
    if char == '{':
        open_braces += 1
    elif char == '}':
        close_braces += 1
        if close_braces > open_braces:
            errors.append(f"Unbalanced close brace at character index {idx}")

results = []
results.append(f"Open braces: {open_braces}")
results.append(f"Close braces: {close_braces}")
if open_braces != close_braces:
    results.append("WARNING: Mismatched brace count!")
else:
    results.append("Brace count matches perfectly!")

if errors:
    for err in errors[:5]:
        results.append(err)

with open("check_results.txt", "w", encoding="utf-8") as out:
    out.write("\n".join(results))
print("Done")
