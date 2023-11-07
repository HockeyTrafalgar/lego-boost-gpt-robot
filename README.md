# A toy robot for having fun with kids

Runs in browser with no backend. Requires OpenAI key (stored locally).  Needs HTTPS to work properly.

## Web Bluetooth API

Application uses [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) to communicate with Lego Boost.

Bluetooth is not supported in Chrome or Safari on iOS, install WebBLE browser to run it on iPhones. On Android/Desktops it runs just fine.

[Supported devices](https://github.com/WebBluetoothCG/web-bluetooth/blob/master/implementation-status.md)

## To rebuild the Lego BOOST Bluetooth connect library, run:

```sh
$ npm run build:browser
```

## Build distributable

```sh
$ npm run build
```

## Credits

Communication and control code is ported from these libraries:

- Node module for controlling Lego Boost: https://github.com/hobbyquaker/node-movehub
  - [hub.ts](./src/hub.ts)
- Async implementation of Node module: https://github.com/ttu/node-movehub-async
  - [hubAsync.ts](./src/hubAsync.ts)
- Node application for controlling Lego Boost: https://github.com/ttu/lego-boost-ai
  - [hubControl.ts](./src/ai/hubControl.ts)
- Angular application: https://github.com/BenjaminDobler/ng-lego-boost
- The buffer module from node.js, for the browser: https://github.com/feross/buffer


Reverse engineering the LEGO BOOST Hub
  - https://github.com/JorgePe/BOOSTreveng

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Disclaimer

LEGO and BOOST are Trademarks from The LEGO Company, which do not support this project.

Project maintainers are not responsible for any damage on your LEGO BOOST devices - use it at your own risk.

## License

Licensed under the [MIT](https://github.com/ttu/lego-boost-browser/blob/master/LICENSE) License.
