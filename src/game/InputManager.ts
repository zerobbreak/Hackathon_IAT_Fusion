import { InputState } from './types';

export class InputManager {
  private state: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
    boost: false,
    pause: false,
    mouseX: 0,
    mouseY: 0,
    touch: null,
  };

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private swipeThreshold = 30;
  private tapThreshold = 200;

  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;
  private mousemoveHandler: (e: MouseEvent) => void;
  private mousedownHandler: (e: MouseEvent) => void;
  private mouseupHandler: (e: MouseEvent) => void;
  private touchstartHandler: (e: TouchEvent) => void;
  private touchmoveHandler: (e: TouchEvent) => void;
  private touchendHandler: (e: TouchEvent) => void;

  private onSwipeLeft?: () => void;
  private onSwipeRight?: () => void;
  private onSwipeUp?: () => void;
  private onSwipeDown?: () => void;
  private onTap?: () => void;

  constructor() {
    this.keydownHandler = this.handleKeydown.bind(this);
    this.keyupHandler = this.handleKeyup.bind(this);
    this.mousemoveHandler = this.handleMouseMove.bind(this);
    this.mousedownHandler = this.handleMouseDown.bind(this);
    this.mouseupHandler = this.handleMouseUp.bind(this);
    this.touchstartHandler = this.handleTouchStart.bind(this);
    this.touchmoveHandler = this.handleTouchMove.bind(this);
    this.touchendHandler = this.handleTouchEnd.bind(this);
  }

  init() {
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
    window.addEventListener('mousemove', this.mousemoveHandler);
    window.addEventListener('mousedown', this.mousedownHandler);
    window.addEventListener('mouseup', this.mouseupHandler);
    window.addEventListener('touchstart', this.touchstartHandler, { passive: false });
    window.addEventListener('touchmove', this.touchmoveHandler, { passive: false });
    window.addEventListener('touchend', this.touchendHandler, { passive: false });
  }

  destroy() {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    window.removeEventListener('mousemove', this.mousemoveHandler);
    window.removeEventListener('mousedown', this.mousedownHandler);
    window.removeEventListener('mouseup', this.mouseupHandler);
    window.removeEventListener('touchstart', this.touchstartHandler);
    window.removeEventListener('touchmove', this.touchmoveHandler);
    window.removeEventListener('touchend', this.touchendHandler);
  }

  setSwipeCallbacks(callbacks: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onTap?: () => void;
  }) {
    this.onSwipeLeft = callbacks.onSwipeLeft;
    this.onSwipeRight = callbacks.onSwipeRight;
    this.onSwipeUp = callbacks.onSwipeUp;
    this.onSwipeDown = callbacks.onSwipeDown;
    this.onTap = callbacks.onTap;
  }

  private handleKeydown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    
    if (key === 'arrowleft' || key === 'a') {
      this.state.left = true;
      e.preventDefault();
    }
    if (key === 'arrowright' || key === 'd') {
      this.state.right = true;
      e.preventDefault();
    }
    if (key === 'arrowup' || key === 'w') {
      this.state.up = true;
      e.preventDefault();
    }
    if (key === 'arrowdown' || key === 's') {
      this.state.down = true;
      e.preventDefault();
    }
    if (key === ' ' || key === 'f') {
      this.state.shoot = true;
      e.preventDefault();
    }
    if (key === 'shift') {
      this.state.boost = true;
      e.preventDefault();
    }
    if (key === 'escape' || key === 'p') {
      this.state.pause = true;
      e.preventDefault();
    }
  }

  private handleKeyup(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    
    if (key === 'arrowleft' || key === 'a') this.state.left = false;
    if (key === 'arrowright' || key === 'd') this.state.right = false;
    if (key === 'arrowup' || key === 'w') this.state.up = false;
    if (key === 'arrowdown' || key === 's') this.state.down = false;
    if (key === ' ' || key === 'f') this.state.shoot = false;
    if (key === 'shift') this.state.boost = false;
    if (key === 'escape' || key === 'p') this.state.pause = false;
  }

  private handleMouseMove(e: MouseEvent) {
    this.state.mouseX = e.clientX;
    this.state.mouseY = e.clientY;
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      this.state.shoot = true;
    }
  }

  private handleMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.state.shoot = false;
    }
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.touchStartTime = Date.now();
      this.state.touch = { x: this.touchStartX, y: this.touchStartY };
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (e.touches.length > 0) {
      this.state.touch = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
    e.preventDefault();
  }

  private handleTouchEnd(e: TouchEvent) {
    if (e.changedTouches.length > 0) {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      const dy = e.changedTouches[0].clientY - this.touchStartY;
      const dt = Date.now() - this.touchStartTime;

      if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && dt < this.tapThreshold) {
        this.onTap?.();
      } else if (Math.abs(dx) > this.swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) this.onSwipeLeft?.();
        else this.onSwipeRight?.();
      } else if (Math.abs(dy) > this.swipeThreshold) {
        if (dy < 0) this.onSwipeUp?.();
        else this.onSwipeDown?.();
      }
    }
    this.state.touch = null;
    e.preventDefault();
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  isMovingLeft(): boolean {
    return this.state.left;
  }

  isMovingRight(): boolean {
    return this.state.right;
  }

  isMovingUp(): boolean {
    return this.state.up;
  }

  isMovingDown(): boolean {
    return this.state.down;
  }

  isShooting(): boolean {
    return this.state.shoot;
  }

  isBoosting(): boolean {
    return this.state.boost;
  }

  consumePause(): boolean {
    if (this.state.pause) {
      this.state.pause = false;
      return true;
    }
    return false;
  }

  resetShoot() {
    this.state.shoot = false;
  }
}

export const inputManager = new InputManager();
