import { EventEmitter } from 'events';
export class BaseAgent extends EventEmitter {
    id;
    model;
    constructor(id, model) {
        super();
        this.id = id;
        this.model = model;
    }
    emitOutput(line) {
        this.emit('output', line);
    }
    makeLine(content, type = 'text', toolName) {
        return { timestamp: Date.now(), type, content, toolName };
    }
}
//# sourceMappingURL=base.js.map