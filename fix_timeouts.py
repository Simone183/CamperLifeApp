import re

with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("AbortSignal.timeout(6000)", "AbortSignal.timeout(3500)")
content = content.replace("AbortSignal.timeout(10000)", "AbortSignal.timeout(5000)")

with open('server.ts', 'w') as f:
    f.write(content)
print("Timeouts reduced")
