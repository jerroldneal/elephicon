import { IoIosUndo } from 'react-icons/io';

type Props = {
  log: string;
  success: boolean;
  desktop: boolean;
  onClickBack: () => void;
  preventDefault: (e: React.DragEvent<HTMLDivElement>) => void;
};

export const Message = (props: Props) => {
  return (
    <div
      className="drop-message-zone"
      onDrop={props.preventDefault}
      onDragEnter={props.preventDefault}
      onDragOver={props.preventDefault}
      onDragLeave={props.preventDefault}
    >
      <div className="text">
        {props.success ? 'Successfully Completed!' : 'Something went wrong...'}
      </div>
      {props.success ? (
        <div className="result">
          <div className="filename">{props.log}</div>
          was created
          {props.desktop ? ' on your desktop' : ' in the current folder'}.
        </div>
      ) : (
        <div className="result">
          <div className="error">{props.log}</div>
        </div>
      )}
      <div className="switch">
        <div className="back-container" onClick={props.onClickBack}>
          <div className="icon">
            <IoIosUndo />
          </div>
          <div>Back</div>
        </div>
      </div>
    </div>
  );
};
