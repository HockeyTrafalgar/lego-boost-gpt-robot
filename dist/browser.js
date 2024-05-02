var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import LegoBoost from './legoBoost';
import { MediaRecorder } from 'extendable-media-recorder';
const boost = new LegoBoost();
// @ts-ignore
window.boost = boost;
// @ts-ignore
boost.logDebug = console.log;
console.log('Running in browser');
function startRec() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Start rec');
        const mediaStream = yield navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(mediaStream, {
            mimeType: 'audio/wav',
        });
        let header;
        mediaRecorder.addEventListener('dataavailable', ({ data }) => __awaiter(this, void 0, void 0, function* () {
            console.log('dataavailable');
            if (header === undefined) {
                header = (yield data.arrayBuffer()).slice(0, 44);
                //uploadWav(data);
            }
            else {
                const content = yield data.arrayBuffer();
                //uploadWav(new Blob([header, content], { type: data.type }));
            }
        }));
        mediaRecorder.start(15000);
    });
}
startRec();
//# sourceMappingURL=browser.js.map