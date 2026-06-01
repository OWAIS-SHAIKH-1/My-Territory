with open('index.html', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        if 'welcome-name' in line:
            print(f"index.html {idx+1}: {line.strip()}")
