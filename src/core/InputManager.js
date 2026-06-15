export class InputManager {
    constructor(callbacks) {
        this.onLeft = callbacks.onLeft;
        this.onRight = callbacks.onRight;
        this.onJump = callbacks.onJump;

        this.bindKeys();
        this.bindTouch();
    }

    bindKeys() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.onLeft();
            if (e.key === 'ArrowRight' || e.key === 'd') this.onRight();
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') this.onJump();
        });
    }

    bindTouch() {
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnJump = document.getElementById('btn-jump');

        if (btnLeft) btnLeft.onclick = () => this.onLeft();
        if (btnRight) btnRight.onclick = () => this.onRight();
        if (btnJump) btnJump.onclick = () => this.onJump();
    }
}