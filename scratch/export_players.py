import csv
import json
import urllib.request
import urllib.parse

SUPABASE_URL = 'https://hopencygilaeevvvxkvu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcGVuY3lnaWxhZWV2dnZ4a3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI3NDIsImV4cCI6MjA5MTU3ODc0Mn0.ccOeebsqB7bmAskFUBfYg4hruzAmdmod7F8--8GEGAY'

def export_players():
    url = f"{SUPABASE_URL}/rest/v1/jugadores?select=nombre,fechanacimiento,anionacimiento,equipoConvenido"
    
    req = urllib.request.Request(url)
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                print(f"Error fetching data: {response.status}")
                return
            
            data = response.read().decode('utf-8')
            players = json.loads(data)
    except Exception as e:
        print(f"Request failed: {e}")
        return

    output_file = "directorio_jugadores.csv"
    
    with open(output_file, mode='w', newline='', encoding='utf-8-sig') as csvfile:
        fieldnames = ['Nombre', 'Fecha de Nacimiento', 'Club']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, delimiter=';')
        
        writer.writeheader()
        for p in players:
            # Determine birth date/year
            fecha = p.get('fechanacimiento') or p.get('anionacimiento') or ""
            
            writer.writerow({
                'Nombre': p.get('nombre', ''),
                'Fecha de Nacimiento': fecha,
                'Club': p.get('equipoConvenido', '')
            })
            
    print(f"Exportado exitosamente a {output_file}")

if __name__ == "__main__":
    export_players()
