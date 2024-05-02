var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const BOOST_HUB_SERVICE_UUID = '00001623-1212-efde-1623-785feabcd123';
const BOOST_CHARACTERISTIC_UUID = '00001624-1212-efde-1623-785feabcd123';
export class BoostConnector {
    static connect(disconnectCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                acceptAllDevices: false,
                filters: [{ services: [BOOST_HUB_SERVICE_UUID] }],
                optionalServices: [BOOST_HUB_SERVICE_UUID],
            };
            this.device = yield navigator.bluetooth.requestDevice(options);
            this.device.addEventListener('gattserverdisconnected', (event) => __awaiter(this, void 0, void 0, function* () {
                yield disconnectCallback();
            }));
            // await this.device.watchAdvertisements();
            // this.device.addEventListener('advertisementreceived', event => {
            //   // @ts-ignore
            //   console.log(event.rssi);
            // });
            return BoostConnector.getCharacteristic(this.device);
        });
    }
    static getCharacteristic(device) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield device.gatt.connect();
            const service = yield server.getPrimaryService(BOOST_HUB_SERVICE_UUID);
            return yield service.getCharacteristic(BOOST_CHARACTERISTIC_UUID);
        });
    }
    static reconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.device) {
                const bluetooth = yield BoostConnector.getCharacteristic(this.device);
                return [true, bluetooth];
            }
            return [false, null];
        });
    }
    static disconnect() {
        if (this.device) {
            this.device.gatt.disconnect();
            return true;
        }
        return false;
    }
}
BoostConnector.isWebBluetoothSupported = navigator.bluetooth ? true : false;
//# sourceMappingURL=boostConnector.js.map