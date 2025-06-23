import { useState, useEffect } from "react";
import { Dialog, Button, InputGroup, Classes, Intent } from "@blueprintjs/core";
import config from "../../config";

const STORAGE_KEY = "customRpcEndpoint";

export default function DialogRpcSettings({ isOpen, onClose, onEndpointChange }) {
  const [value, setValue] = useState("");
  const [initial, setInitial] = useState("");

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(STORAGE_KEY) || config.websocketEndpoint;
      setValue(stored);
      setInitial(stored);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, value);
    onEndpointChange(value);
    onClose();
  };

  const handleReset = () => {
    setValue(config.websocketEndpoint);
    localStorage.setItem(STORAGE_KEY, config.websocketEndpoint);
    onEndpointChange(config.websocketEndpoint);
  };

  return (  
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      className="custom-rpc-dialog"
      style={{
        backgroundColor: config.DIALOG_RPC_SETTINGS_COLORS.background, // Dark gray background color
        border: `2px solid ${config.DIALOG_RPC_SETTINGS_COLORS.border}`,
        borderRadius: "8px", // Rounded corners
     }}
      canEscapeKeyClose
      canOutsideClickClose
    >
    <div className="bg-gray-800 text-gray-400 rounded">
      <div className={Classes.DIALOG_BODY}>
        <label className={Classes.LABEL} style={{ marginBottom: 8 }}>
          WebSocket RPC Endpoint
        </label>
        <div style={{ display: "flex", gap: 8}}>
          <InputGroup
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fill
            className="custom-input"
            style={{ backgroundColor: config.DIALOG_RPC_SETTINGS_COLORS.border, color: config.DIALOG_RPC_SETTINGS_COLORS.text, borderColor: config.DIALOG_RPC_SETTINGS_COLORS.border }}
          />
          <Button
            icon="reset"
            intent={Intent.WARNING}
            disabled={value === config.websocketEndpoint}
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button 
            className="custom-cancel-button"
            style={{ backgroundColor: config.DIALOG_RPC_SETTINGS_COLORS.border, color: config.DIALOG_RPC_SETTINGS_COLORS.text }}
            onClick={onClose}>Cancel
          </Button>
          <Button
            intent={Intent.PRIMARY}
            icon="tick"
            className="custom-save-button"
            style={{ backgroundColor: "#6366F1" }}
            onClick={handleSave}
            disabled={!value}
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
