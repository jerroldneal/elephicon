import React, { useState, useEffect, useCallback } from 'react';

import { Error } from './Error';
import { Success } from './Success';
import { Dropzone } from './Dropzone';

import 'typeface-roboto';
import './App.scss';

const { myAPI } = window;

export const App = (): JSX.Element => {
  const [ico, setIco] = useState(true);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState('');
  const [desktop, setDesktop] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const afterConvert = (result: Result): void => {
    result.type === 'failed' ? setError(true) : setSuccess(true);

    setLoading(false);
    setMessage(result.msg);
    setDesktop(result.desktop);
  };

  const convert = useCallback(
    async (filepath: string): Promise<void> => {
      const mime = await myAPI.mimecheck(filepath);

      if (!mime || !mime.match(/png/)) {
        setLoading(false);

        const message = mime ? mime : 'Unknown';
        setMessage(`Invalid format: ${message}`);
        setError(true);

        return;
      }

      if (ico) {
        const result = await myAPI.mkIco(filepath);
        afterConvert(result);
      } else {
        const result = await myAPI.mkIcns(filepath);
        afterConvert(result);
      }
    },
    [ico]
  );

  const preventDefault = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    if (loading) return;

    preventDefault(e);
    setDrag(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    preventDefault(e);
    setDrag(false);
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>): Promise<void> => {
    if (loading) return;

    preventDefault(e);
    setDrag(false);

    if (e.dataTransfer) {
      setLoading(true);
      const file = e.dataTransfer.files[0];

      await convert(file.path);
    }
  };

  const onClickOS = () => {
    if (loading) return;

    setIco(!ico);
  };

  const onClickOpen = async (): Promise<void> => {
    if (loading) return;

    const filepath = await myAPI.openDialog();
    if (!filepath) return;

    setLoading(true);
    await convert(filepath);
  };

  const onClickBack = () => {
    setDrag(false);
    setError(false);
    setSuccess(false);
    setMessage('');
  };

  const onContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    myAPI.contextMenu();
  };

  useEffect(() => {
    myAPI.menuOpen(async (_e, filepath) => {
      if (!filepath) return;

      setLoading(true);
      await convert(filepath);
    });

    return (): void => {
      myAPI.removeMenuOpen();
    };
  }, [convert]);

  useEffect(() => {
    myAPI.setDesktop((_e, arg) => setDesktop(arg));

    return (): void => {
      myAPI.removeDesktop();
    };
  }, []);

  return (
    <div className="container" onContextMenu={onContextMenu}>
      {!success && !error ? (
        <Dropzone
          ico={ico}
          drag={drag}
          loading={loading}
          onDrop={onDrop}
          onClickOS={onClickOS}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClickOpen={onClickOpen}
        />
      ) : success ? (
        <Success
          desktop={desktop}
          message={message}
          onClickBack={onClickBack}
          preventDefault={preventDefault}
        />
      ) : (
        <Error
          message={message}
          onClickBack={onClickBack}
          preventDefault={preventDefault}
        />
      )}
    </div>
  );
};
