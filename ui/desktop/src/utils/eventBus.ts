// Simple event bus for Tauri environment
type EventHandler = (...args: any[]) => void;

class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    if (this.events.has(event)) {
      this.events.get(event)!.delete(handler);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.events.has(event)) {
      this.events.get(event)!.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Helper function to trigger extension installation from anywhere
export function triggerExtensionInstall(link: string): void {
  eventBus.emit('add-extension', link);
}