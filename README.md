# 🏎️ Formula 1 Racing Game

Akční závodní hra typu top-down s pokročilou drift mechanikou a dynamickou obtížností. Unikejte policii, sbírejte pneumatiky a postupujte do vyšších levelů!

## 🎮 Jak hrát

### Ovládání
- **Šipka nahoru** - Pohyb vpřed
- **Šipka dolů** - Couvání
- **Šipky vlevo/vpravo** - Zatáčení
- **MEZERNÍK** - Drift (při zatáčení a rychlosti nad 50 km/h)

### Cíl hry
Seberete všechny pneumatiky na mapě a postupujte do dalšího levelu, aniž byste narazili do policejních aut!

## ⚡ Herní mechaniky

### Drift systém
- **Aktivace**: Držte MEZERNÍK při zatáčení a jízdě vpřed
- **3 úrovně driftu**:
  - 🔵 DRIFT! - Základní drift
  - 🟡 SUPER DRIFT! - Střední drift (10+ bodů)
  - 🟣 MEGA DRIFT! - Mega drift (20+ bodů)
- **Odměny**:
  - Okamžitý boost po ukončení driftu
  - **Super Boost**: +20% rychlost na 10 sekund po úspěšném driftu
- **Vizuální efekty**: Cyan částice za autem během driftu

### Level systém
- **Začátek**: Level 1 - 3 policejní auta + 3 pneumatiky
- **Postup**: Každý level +1 policie, +1 pneumatika
- **Obtížnost**:
  - Každá sebraná pneumatika zvyšuje rychlost policie o 10%
  - Reset rychlosti policie při novém levelu

### Policejní AI
- **Pronásledování**: Aktivně sledují hráče po celé mapě
- **Vyhýbání**: Inteligentně se vyhýbají pneumatikám
- **Rychlost**: 1/6 rychlosti formule (dynamicky se zvyšuje)
- **Chování na okraji**: Automatické couvání a otočení o 180°

### Bonusy (Pneumatiky)
- **Sběr**: Jednoduše projeďte přes pneumatiku
- **Efekt**: Zvyšuje rychlost policejních aut o 10%
- **Strategie**: Fungují jako dočasná překážka pro policii

## 🎯 UI prvky

- **Časovač**: Sleduje celkový herní čas
- **Čítač bonusů**: Zobrazuje sebrané/celkové pneumatiky
- **Level indikátor**: Aktuální level
- **Drift indikátor**: Stav driftu a boostu

## 🚀 Technologie

- **Engine**: Phaser 3 (v3.85.0)
- **Fyzika**: Matter.js
- **Graphics**: Canvas rendering
- **Assety**:
  - Dirt_02.png - Hliněné pozadí
  - pitstop_car_11.png - F1 auto hráče
  - police-car-siren-red.png - Policejní auta
  - tire.png - Pneumatiky (bonusy)

## 🛠️ Instalace a spuštění

### Předpoklady
- Node.js (pro lokální HTTP server)

### Spuštění
```bash
# Naklonujte repozitář
git clone <repository-url>
cd formula1-game

# Spusťte lokální HTTP server (port 8000)
npx http-server -p 8000

# Otevřete v prohlížeči
# http://127.0.0.1:8000
```

**Důležité**: Hru je nutné spouštět přes HTTP server kvůli CORS omezením při načítání obrázků.

## 📁 Struktura projektu

```
formula1-game/
├── index.html          # Hlavní HTML soubor
├── game.js            # Herní logika
├── img/               # Herní assety
│   ├── Dirt_02.png
│   ├── pitstop_car_11.png
│   ├── police-car-siren-red.png
│   └── tire.png
└── README.md          # Dokumentace
```

## 🎨 Herní features

### Fyzikální engine
- Realistické ovládání auta s friction
- Kolizní detekce pomocí Matter.js
- Fixed rotation pro stabilní ovládání

### Vizuální efekty
- Částicový systém pro drift efekt
- Plynulé animace a tweening
- Responsive fullscreen design

### AI systém
- Path finding k hráči
- Obstacle avoidance (pneumatiky)
- Edge detection a recovery

## 🏆 Tipy a triky

1. **Sbírejte rychle**: Čím déle čekáte, tím rychlejší je policie
2. **Využívejte drift**: 20% speed boost může zachránit život
3. **Pneumatiky jako štít**: Schováte se za ně před policií
4. **Plánovejte trasu**: Minimalizujte vzdálenost mezi pneumatikami
5. **Okraje mapy**: Udržujte se v centru pro lepší manévrovatelnost

## 📊 Herní statistiky

### Při Game Over se zobrazí:
- Dosažený level
- Celkový čas
- Počet sebraných pneumatik

## 🔧 Vývoj

Hra byla vytvořena jako demonstrace pokročilých herních mechanik v Phaser 3:
- AI pronásledování s path finding
- Komplexní drift systém s částicovými efekty
- Dynamický level systém s postupnou obtížností
- Responsivní fullscreen design

## 📝 Licence

Tento projekt je vytvořen pro vzdělávací účely.

## 🎮 Začněte hrát!

```bash
npx http-server -p 8000
```

Poté otevřete `http://127.0.0.1:8000` v prohlížeči a užijte si hru!

---

**Vytvořeno s ❤️ pomocí Claude Code**
