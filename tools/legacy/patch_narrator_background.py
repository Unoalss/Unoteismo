with open('biblia.js', 'r', encoding='utf-8') as f:
    code = f.read()

start_marker = "  const BibleNarrator = {"
end_marker = "\n  };\n\n  // Inicializar Narrador Sagrado"

start_pos = code.find(start_marker)
end_pos = code.find(end_marker, start_pos)

if start_pos == -1 or end_pos == -1:
    print(f"Erro: marcadores não encontrados! start_pos={start_pos}, end_pos={end_pos}")
    exit(1)

with open('scratch/narrator_code.js', 'r', encoding='utf-8') as f:
    narrator_code = f.read()

new_code = code[:start_pos] + narrator_code + code[end_pos:]

with open('biblia.js', 'w', encoding='utf-8') as f:
    f.write(new_code)

print("biblia.js atualizado com sucesso usando slice preciso!")
