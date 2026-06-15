import { CONFIG } from '../Config.js';
import { setPreviewPlayer, openReviewScreen, closeReviewScreen } from './MenuPreview.js';

export class UIManager {
    constructor(callbacks) {
        this.onStartGame = callbacks.onStartGame;
        this.dom = {
            menu: document.getElementById('main-menu'),
            containerPlayer: document.getElementById('container-player'),
            btnPlay: document.getElementById('btn-play'),
            btnSetting: document.getElementById('btn-setting'),
            btnReview: document.getElementById('btn-review'),
            btnReviewClose: document.getElementById('btn-review-close'),
        };

        this.selectedPlayerId = CONFIG.PLAYERS[0].id;
        this.selectedMonsterId = CONFIG.MONSTERS[0].id;

        this.init();
    }

    init() {
        // 1. Sinh nút chọn Người chạy ở menu chính
        CONFIG.PLAYERS.forEach((p, index) => {
            const btn = this.createSelectButton(p.name, p.id, index === 0);
            btn.onclick = () => this.selectPlayer(p.id);
            this.dom.containerPlayer.appendChild(btn);
        });

        // 2. Nút Play
        this.dom.btnPlay.onclick = () => {
            this.dom.menu.classList.add('hidden');
            this.onStartGame(this.selectedPlayerId, null);
        };

        // 3. Nút Setting
        this.dom.btnSetting.onclick = () => alert('Setting Screen - coming soon');

        // 4. Nút Review
        if (this.dom.btnReview) {
            this.dom.btnReview.onclick = () => {
                openReviewScreen(
                    this.selectedPlayerId,
                    (newId, kind) => {
                        if (kind === 'player') {
                            this.selectedPlayerId = newId;
                            this.updateButtonVisuals(this.dom.containerPlayer, newId);
                            setPreviewPlayer(newId);
                        } else if (kind === 'monster') {
                            this.selectedMonsterId = newId;
                        }
                    }
                );
            };
        }

        // 5. Nút đóng subscreen
        if (this.dom.btnReviewClose) {
            this.dom.btnReviewClose.onclick = () => closeReviewScreen();
        }

        // 6. Click nền đen subscreen để đóng
        const reviewScreen = document.getElementById('review-screen');
        if (reviewScreen) {
            reviewScreen.addEventListener('click', (e) => {
                if (e.target === reviewScreen) {
                    closeReviewScreen();
                }
            });
        }

        // 7. Phím ESC để đóng subscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const screen = document.getElementById('review-screen');
                if (screen && screen.classList.contains('show')) {
                    closeReviewScreen();
                }
            }
        });
    }

    createSelectButton(name, id, isActive) {
        const btn = document.createElement('button');
        btn.className = `select-btn ${isActive ? 'active' : ''}`;
        btn.innerText = name;
        btn.dataset.id = id;
        return btn;
    }

    selectPlayer(id) {
        this.selectedPlayerId = id;
        this.updateButtonVisuals(this.dom.containerPlayer, id);
        setPreviewPlayer(id);
    }

    updateButtonVisuals(container, selectedId) {
        const btns = container.querySelectorAll('.select-btn');
        btns.forEach(b => {
            if (b.dataset.id === selectedId) b.classList.add('active');
            else b.classList.remove('active');
        });
    }
}
