var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { manual } from './states/manual';
import { stop, back, drive, turn, seek } from './states/ai';
class HubControl {
    constructor(deviceInfo, controlData, configuration) {
        this.hub = null;
        this.device = deviceInfo;
        this.control = controlData;
        this.configuration = configuration;
        this.prevControl = Object.assign({}, this.control);
        this.states = {
            Turn: turn,
            Drive: drive,
            Stop: stop,
            Back: back,
            Manual: manual,
            Seek: seek,
        };
        this.currentState = this.states['Manual'];
    }
    updateConfiguration(configuration) {
        this.configuration = configuration;
    }
    start(hub) {
        return __awaiter(this, void 0, void 0, function* () {
            this.hub = hub;
            this.device.connected = true;
            this.hub.emitter.on('error', err => {
                this.device.err = err;
            });
            this.hub.emitter.on('disconnect', () => {
                this.device.connected = false;
            });
            this.hub.emitter.on('distance', distance => {
                this.device.distance = distance;
            });
            this.hub.emitter.on('rssi', rssi => {
                this.device.rssi = rssi;
            });
            this.hub.emitter.on('port', portObject => {
                const { port, action } = portObject;
                this.device.ports[port].action = action;
            });
            this.hub.emitter.on('color', color => {
                this.device.color = color;
            });
            this.hub.emitter.on('tilt', tilt => {
                const { roll, pitch } = tilt;
                this.device.tilt.roll = roll;
                this.device.tilt.pitch = pitch;
            });
            this.hub.emitter.on('rotation', rotation => {
                const { port, angle } = rotation;
                this.device.ports[port].angle = angle;
            });
            yield this.hub.ledAsync('red');
            yield this.hub.ledAsync('yellow');
            yield this.hub.ledAsync('green');
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.device.connected) {
                yield this.hub.disconnectAsync();
            }
        });
    }
    setNextState(state) {
        this.control.controlUpdateTime = undefined;
        this.control.state = state;
        this.currentState = this.states[state];
    }
    update() {
        // TODO: After removing bind, this requires some more refactoring
        this.currentState(this);
        // TODO: Deep clone
        this.prevControl = Object.assign({}, this.control);
        this.prevControl.tilt = Object.assign({}, this.control.tilt);
        this.prevDevice = Object.assign({}, this.device);
    }
}
export { HubControl };
//# sourceMappingURL=hub-control.js.map