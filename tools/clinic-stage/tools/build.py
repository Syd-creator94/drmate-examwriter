"""Create a portable single-file application without bundler dependencies."""
from pathlib import Path
import base64,re,json
root=Path(__file__).resolve().parent.parent
out=root/'dist'
out.mkdir(exist_ok=True)
parts=[]
for name in ['data.mjs','model.mjs','calendar.mjs','ui.mjs','app.mjs']:
    src=(root/'app'/name).read_text()
    src=re.sub(r'^import .+?;\s*\n','',src,flags=re.M)
    src=re.sub(r'\bexport (?=(?:const|let|function))','',src)
    parts.append(src)
script='\n'.join(parts)
mark='data:image/svg+xml;base64,'+base64.b64encode((root/'assets'/'mark.svg').read_bytes()).decode()
script=script.replace('assets/mark.svg',mark)
html=(root/'index.html').read_text()
html=html.replace('href="assets/mark.svg"',f'href="{mark}"')
html=html.replace('<link rel="stylesheet" href="app/styles.css"/>','<style>\n'+(root/'app'/'styles.css').read_text()+'\n</style>')
html=html.replace('<script type="module" src="app/app.mjs"></script>','<script type="module">\n'+script.replace('</script','<\\/script')+'\n</script>')
(out/'index.html').write_text(html)
(out/'clinic-stage.html').write_text(html)
manifest=root/'.openai'/'hosting.json'
if manifest.exists():
    data=json.loads(manifest.read_text());data['static']={'directory':'dist'}
    tmp=manifest.with_suffix('.json.tmp');tmp.write_text(json.dumps(data,indent=2)+'\n');tmp.replace(manifest)
print(f'Built dist/index.html: {len(html.encode()):,} bytes. No remote runtime dependencies.')
