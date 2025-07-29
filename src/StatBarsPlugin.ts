import { Plugin, SettingsTypes } from "@highlite/plugin-api";
import styleCss from "./styles.css";

const styleId = "hl-stat-bars-style";
const barClassName = "hl-stat-bars-progress-bar";
const defaultBgColor = "#e7000b";
const defaultFgColor = "#5ea500";

export class StatBarsPlugin extends Plugin {
    pluginName = "Stat Bars";
    author = "SoggyPiggy";

    constructor() {
        super();

        this.settings.enable = {
            text: "Enable Stat Bars",
            type: SettingsTypes.checkbox,
            value: false,
            callback: () =>
                this.settings.enable.value ? this.start() : this.stop(),
        };

        this.settings.bgColor = {
            text: "Background Color",
            type: SettingsTypes.color,
            value: defaultBgColor,
            callback: () => this.setStyles(),
        };

        this.settings.fgColor = {
            text: "Foreground Color",
            type: SettingsTypes.color,
            value: defaultFgColor,
            callback: () => this.setStyles(),
        };

        this.settings.restore = {
            text: "Restore Defaults",
            type: SettingsTypes.button,
            value: 0,
            callback: () => {
                this.settings.bgColor.value = defaultBgColor;
                this.settings.fgColor.value = defaultFgColor;
                this.setStyles();
            }
        }
    }

    get isEnabled() {
        return this.settings.enable.value ?? false;
    }

    get bgColor(): string {
        const { value } = this.settings.bgColor;
        if (typeof value === "string") return value;
        return defaultBgColor;
    }

    get fgColor() {
        const { value } = this.settings.fgColor;
        if (typeof value === "string") return value;
        return defaultFgColor;
    }

    get statsMenuControl() {
        return this.gameHooks?.UIManager?.Manager?.getScreenMask()
            ?.getGameMenuBarQuadrant()
            ?.getMenuByType(this.gameLookups?.GameInterfaces?.Stats);
    }

    init(): void {
        this.log("Initialized");
    }

    start() {
        this.setup();
        this.log("Started");
    }

    stop() {
        this.cleanup();
        this.log("Stopped");
    }

    ScreenMask_initializeControls() {
        this.start();
    }

    SocketManager_loggedIn() {
        this.start();
    }

    SocketManager_handleLoggedOut() {
        this.stop();
    }

    StatsMenuManager_handleSkillExpChanged(e) {
        if (!this.isEnabled) return;
        const statItem = this.statsMenuControl?.getStatItemForSkill(e?.Skill);
        this.setStatPercentage(e, statItem);
    }

    GameMenuBarManager_handleStatsButtonPointerDownAction() {
        if (!this.isEnabled) return;
        this.setAllPercentages();
    }

    private setAllPercentages() {
        const player = this.gameHooks?.EntityManager?.Instance?.MainPlayer;
        const combatSkills = player?.Combat?.Skills;
        const skillSkills = player?.Skills?.Skills;
        new Array(Math.max(combatSkills?.length, skillSkills?.length)).fill(null).forEach(
            (_, index) => {
                const skill = combatSkills[index] ?? skillSkills[index];
                const statItem = this.statsMenuControl?.getStatItemForSkill(
                    skill?.Skill
                );
                this.setStatPercentage(skill, statItem);
            }
        );
    }

    private setStatPercentage(skill, statItem) {
        if (!skill || !statItem) {
            return;}
        const statElement: HTMLElement | null = statItem.getElement();
        if (!statElement) return;
        let barElement = statElement.getElementsByClassName(barClassName)[0];
        if (!barElement) {
            barElement = document.createElement("div");
            barElement.className = barClassName;
            statElement.appendChild(barElement);
        }
        const xpManager = this.gameHooks?.ExperienceManager;
        const baseXP = xpManager?.getExperienceAtLevel(skill.Level);
        const targetXP = xpManager?.getExperienceAtLevel(skill.Level + 1);
        const percentage = ((skill.XP - baseXP) / (targetXP - baseXP)) * 100;
        barElement.innerHTML = `<div style="width:${percentage}%;"><div/>`;
    }

    private setStyles() {
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = styleId;
            document.body.appendChild(styleElement);
        }
        styleElement.textContent = `
            .${barClassName} {
                background: ${this.bgColor};
            }
            .${barClassName} > * {
                background: ${this.fgColor};
            }\n\n${styleCss}`;
    }

    private setup() {
        if (!document.getElementById(styleId)) {
            this.setStyles();
        }
        this.setAllPercentages();
    }

    private cleanup() {
        const styleElement = document.getElementById(styleId);
        if (styleElement) styleElement.remove();
        const barElements = Array.from(
            document.getElementsByClassName(barClassName)
        );
        barElements.forEach((element) => element.remove());
    }
}

export default StatBarsPlugin;
