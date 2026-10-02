import re

with open('app.js', 'r') as f:
    content = f.read()

# 1. Torneos, Equipos, Jugadores, RAE cards
content = content.replace('p-10 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-xl', 'p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300')

# 2. Icon containers
content = content.replace('w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm', 'w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center')
content = content.replace('w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200', 'w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center')
content = content.replace('w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center', 'w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center')
content = content.replace('w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm', 'w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center')
content = content.replace('w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:-rotate-6 transition-transform shadow-sm', 'w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center transition-transform')
content = content.replace('w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm', 'w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center')

# 3. Inner icons
content = content.replace('class="w-7 h-7"', 'class="w-5 h-5"')
content = content.replace('class="w-8 h-8"', 'class="w-5 h-5"')

# 4. Buttons at the bottom of cards
content = content.replace('py-4 bg-amber-500 text-white hover:bg-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-200', 'py-3 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all')
content = content.replace('py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-200', 'py-3 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all')
content = content.replace('py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-200', 'py-3 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all')
content = content.replace('py-5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-200', 'py-3 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all')
content = content.replace('px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-200', 'px-6 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all')

# 5. Colored internal stats to simple borders and backgrounds
content = content.replace('bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100', 'bg-slate-50 p-3 rounded-xl border border-slate-100')
content = content.replace('text-[10px] font-black text-emerald-600', 'text-[10px] font-bold text-slate-500')
content = content.replace('text-2xl font-black text-emerald-600', 'text-xl font-black text-slate-800')

content = content.replace('bg-amber-50/50 p-4 rounded-2xl border border-amber-100', 'bg-slate-50 p-3 rounded-xl border border-slate-100')
content = content.replace('text-[10px] font-black text-amber-600', 'text-[10px] font-bold text-slate-500')
content = content.replace('text-2xl font-black text-amber-600', 'text-xl font-black text-slate-800')

content = content.replace('bg-blue-50/50 p-4 rounded-2xl border border-blue-100', 'bg-slate-50 p-3 rounded-xl border border-slate-100')
content = content.replace('text-[10px] font-black text-blue-600', 'text-[10px] font-bold text-slate-500')
content = content.replace('text-2xl font-black text-blue-600', 'text-xl font-black text-slate-800')

content = content.replace('bg-rose-50/50 p-4 rounded-2xl border border-rose-100', 'bg-slate-50 p-3 rounded-xl border border-slate-100')
content = content.replace('text-[10px] font-black text-rose-600', 'text-[10px] font-bold text-slate-500')
content = content.replace('text-2xl font-black text-rose-600', 'text-xl font-black text-slate-800')

content = content.replace('bg-blue-50/50 p-3 rounded-xl border border-blue-100', 'bg-slate-50 p-3 rounded-xl border border-slate-100')
content = content.replace('text-[8px] font-black text-blue-600', 'text-[8px] font-bold text-slate-500')
content = content.replace('text-xl font-black text-blue-600', 'text-xl font-black text-slate-800')

content = content.replace('bg-rose-50/50 p-3 rounded-xl border border-rose-100', 'bg-slate-50 p-3 rounded-xl border border-slate-100')
content = content.replace('text-[8px] font-black text-rose-600', 'text-[8px] font-bold text-slate-500')
content = content.replace('text-xl font-black text-rose-600', 'text-xl font-black text-slate-800')

# 6. Session boxes palette
content = re.sub(r'const palette = \[(.*?)\];', "const palette = [{ bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-800' }];", content, flags=re.DOTALL)
content = content.replace('text-[9px] font-black text-slate-700', 'text-[9px] font-bold text-slate-500')

with open('app.js', 'w') as f:
    f.write(content)
