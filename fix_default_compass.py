import re
with open('src/components/FullscreenNavigator.tsx', 'r') as f:
    content = f.read()

content = content.replace("const [useCompass, setUseCompass] = React.useState<boolean>(true);", "const [useCompass, setUseCompass] = React.useState<boolean>(false);")

# Update button style
old_btn = """className="bg-slate-900/95 hover:bg-slate-800 text-white w-14 h-14 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col items-center justify-center gap-0.5 hover:border-slate-500 transition-all pointer-events-auto cursor-pointer\""""
new_btn = """className={`bg-slate-900/95 hover:bg-slate-800 text-white w-14 h-14 rounded-2xl border ${useCompass ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-slate-700/80'} shadow-2xl flex flex-col items-center justify-center gap-0.5 hover:border-slate-500 transition-all pointer-events-auto cursor-pointer`}"""
content = content.replace(old_btn, new_btn)

with open('src/components/FullscreenNavigator.tsx', 'w') as f:
    f.write(content)
