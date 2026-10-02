import re

with open('scratch/sidebar.html', 'r') as f:
    content = f.read()

# 1. <aside> classes
content = content.replace('bg-white border-r border-slate-200', 'bg-slate-900 border-r border-slate-800')

# 2. Header and Workspace Toggle border bottoms
content = content.replace('border-b border-slate-50', 'border-b border-slate-800')

# 3. Workspace Toggle container
content = content.replace('bg-slate-100 p-1.5 rounded-2xl flex gap-1 relative overflow-hidden mb-4', 
                          'bg-slate-800 p-1.5 rounded-2xl flex gap-1 relative overflow-hidden mb-4')

# 4. mode-personal button
content = content.replace('bg-white text-blue-600 shadow-sm', 'bg-blue-600 text-white shadow-sm border border-slate-700')

# 5. mode-global button hover
content = content.replace('text-slate-400 hover:text-slate-600', 'text-slate-400 hover:text-slate-200')

# 6. Season selector select
content = content.replace('bg-slate-50 border border-slate-100 rounded-xl outline-none text-[11px] font-black text-slate-700 capitalize tracking-tight focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer', 
                          'bg-slate-800 border border-slate-700 rounded-xl outline-none text-[11px] font-black text-slate-200 capitalize tracking-tight focus:ring-4 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer')

# 7. nav-link icons hover
content = content.replace('group-hover:text-blue-600', 'group-hover:text-white')
content = content.replace('text-slate-500 group-hover:text-white', 'text-slate-400 group-hover:text-white')

# 8. nav-link text
content = content.replace('text-sm font-medium">', 'text-sm font-medium text-slate-300 group-hover:text-white">')

# 9. section-header
content = content.replace('text-[10px] font-black text-slate-400 capitalize tracking-widest hover:text-blue-600', 
                          'text-[10px] font-black text-slate-500 capitalize tracking-widest hover:text-slate-300')

# 10. bottom container border
content = content.replace('border-t border-slate-100', 'border-t border-slate-800')

# 11. logout text
content = content.replace('text-slate-500 hover:text-red-600', 'text-slate-400 hover:text-red-400')

with open('scratch/sidebar_updated.html', 'w') as f:
    f.write(content)
