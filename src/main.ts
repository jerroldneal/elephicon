import {
  app,
  Menu,
  dialog,
  ipcMain,
  session,
  nativeTheme,
  BrowserWindow,
} from 'electron';

import log from 'electron-log';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import { searchDevtools } from 'electron-search-devtools';

import path from 'node:path';
import mime from 'mime-types';
import i18next from 'i18next';

import { createMenu } from './createMenu';
import { setLocales } from './setLocales';
import { mkico, mkicns } from './mkicons';

console.log = log.log;
autoUpdater.logger = log;
log.info('App starting...');

process.once('uncaughtException', (err) => {
  log.error('electron:uncaughtException');
  log.error(err.name);
  log.error(err.message);
  log.error(err.stack);
  app.exit();
});

const store = new Store<StoreType>({
  configFileMode: 0o666,
  defaults: {
    ico: true,
    desktop: true,
    x: undefined,
    y: undefined,
    quality: 2,
    bmp: true,
  },
});

const isDarwin = process.platform === 'darwin';
const isDevelop = process.env.NODE_ENV === 'development';

/// #if DEBUG
if (isDevelop) {
  const execPath =
    process.platform === 'win32'
      ? '../node_modules/electron/dist/electron.exe'
      : '../node_modules/.bin/electron';

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('electron-reload')(__dirname, {
    electron: path.resolve(__dirname, execPath),
  });
}
/// #endif

const gotTheLock = app.requestSingleInstanceLock();

const getResourceDirectory = () => {
  return isDevelop
    ? path.join(process.cwd(), 'dist')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'dist');
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    x: store.get('x'),
    y: store.get('y'),
    width: isDarwin ? 360 : 400,
    height: isDarwin ? 320 : 340,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: isDarwin ? 'hidden' : 'default',
    icon: path.join(getResourceDirectory(), 'images/icon.png'),
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#005bea',
    webPreferences: {
      sandbox: true,
      safeDialogs: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';

  ipcMain.handle('mime-check', (_e, filepath) => mime.lookup(filepath));
  ipcMain.handle('make-ico', (_e, filepath) => mkico(filepath, store));
  ipcMain.handle('make-icns', (_e, filepath) => mkicns(filepath, store));

  ipcMain.handle('open-file-dialog', async () => {
    return dialog
      .showOpenDialog(mainWindow, {
        properties: ['openFile'],
        title: i18next.t('Select a PNG File'),
        filters: [
          {
            name: 'PNG file',
            extensions: ['png'],
          },
        ],
      })
      .then((result) => {
        if (result.canceled) return;
        return result.filePaths[0];
      })
      .catch((err): void => console.log(err));
  });

  if (isDarwin && !isDevelop) {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.once('error', (_e, err) => {
      log.info(`Error in auto-updater: ${err}`);
    });

    autoUpdater.once('update-downloaded', async () => {
      log.info(`Update downloaded...`);

      await dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          buttons: ['Restart', 'Later'],
          title: 'Update',
          message: 'Update',
          detail:
            'A new version has been downloaded.\n' +
            'Restart the application to apply the updates.',
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          } else {
            log.info('Restart cancelled...');
          }
        })
        .catch((err) => log.info(`Error in showMessageBox: ${err}`));
    });
  }

  const menu = createMenu(mainWindow, store);
  Menu.setApplicationMenu(menu);

  ipcMain.on('show-context-menu', () => {
    menu.popup();
  });

  if (isDevelop) {
    searchDevtools('REACT')
      .then((devtools) => {
        session.defaultSession.loadExtension(devtools, {
          allowFileAccess: true,
        });
      })
      .catch((err) => console.log(err));

    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.loadFile('dist/index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.once('close', () => {
    const pos = mainWindow.getPosition();
    store.set('x', pos[0]);
    store.set('y', pos[1]);
  });
};

if (!gotTheLock && !isDarwin) {
  app.exit();
} else {
  app.whenReady().then(() => {
    const locale = app.getLocale();
    setLocales(locale);

    createWindow();
  });

  app.setAboutPanelOptions({
    applicationName: app.name,
    applicationVersion: isDarwin
      ? app.getVersion()
      : `v${app.getVersion()} (${process.versions['electron']})`,
    version: process.versions['electron'],
    iconPath: path.join(getResourceDirectory(), 'images/icon.png'),
    copyright: '© 2020 sprout2000 and other contributors',
  });

  app.once('window-all-closed', () => app.exit());
}
