import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Barcode as BarcodeIcon, 
  CheckCircle2, 
  AlertCircle, 
  Usb, 
  Wifi, 
  Volume2, 
  Play, 
  Sparkles,
  HelpCircle,
  Laptop
} from 'lucide-react';
import Barcode from '../Barcode';
import { soundEngine, ScannerSoundStyle } from '../../utils/audio';
import toast from 'react-hot-toast';

interface ScannerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannerConnected: boolean;
  onScannerVerified: (deviceName?: string) => void;
  onDisconnectScanner: () => void;
  currentSoundStyle: ScannerSoundStyle;
  onSoundStyleChange: (style: ScannerSoundStyle) => void;
  currentVolume: number;
  onVolumeChange: (vol: number) => void;
}

export default function ScannerSetupModal({
  isOpen,
  onClose,
  scannerConnected,
  onScannerVerified,
  onDisconnectScanner,
  currentSoundStyle,
  onSoundStyleChange,
  currentVolume,
  onVolumeChange
}: ScannerSetupModalProps) {
  const [testInput, setTestInput] = useState('');
  const [lastDetectedSpeed, setLastDetectedSpeed] = useState<number | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const testInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        testInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle hardware scanner test scan
  const handleTestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = testInput.trim();
      if (code.length >= 3) {
        soundEngine.playScanBeep(currentSoundStyle);
        setTestSuccess(true);
        onScannerVerified('USB / Bluetooth Barcode Scanner');
        toast.success(`Scanner signal verified successfully! Read: [${code}]`);
      }
    }
  };

  // WebHID USB device pairing for supported browsers (Chrome, Edge, Opera)
  const handleConnectWebHID = async () => {
    if (typeof navigator !== 'undefined' && 'hid' in navigator) {
      try {
        const devices = await (navigator as any).hid.requestDevice({
          filters: []
        });
        if (devices && devices.length > 0) {
          const device = devices[0];
          const name = device.productName || 'USB Barcode Scanner';
          onScannerVerified(name);
          soundEngine.playScanBeep(currentSoundStyle);
          toast.success(`Connected to: ${name}`);
          setTestSuccess(true);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error('HID pairing error: ' + err.message);
        }
      }
    } else {
      toast('WebHID not supported in this browser. Use the test scan box below to verify your USB scanner!', {
        icon: 'ℹ️'
      });
      testInputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden relative my-6">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/20 text-[#ea580c] border border-orange-500/30">
              <BarcodeIcon className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-white">
                Scanner Hardware Setup & Audio
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                Verify physical scanner connection and customize loud beep sound
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          
          {/* Real-time Connection Status Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            scannerConnected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                {scannerConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                )}
              </span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">
                  {scannerConnected ? 'Scanner Connected & Verified' : 'Scanner Not Connected (Standby)'}
                </h4>
                <p className="text-[11px] opacity-80 font-medium">
                  {scannerConnected 
                    ? 'Hardware machine is transmitting barcode keystrokes actively.' 
                    : 'Plug USB / Bluetooth scanner into your device and perform a test scan below.'}
                </p>
              </div>
            </div>

            {scannerConnected && (
              <button
                type="button"
                onClick={onDisconnectScanner}
                className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 rounded-lg transition-colors shrink-0"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Test Scan Target Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Usb className="w-3.5 h-3.5 text-orange-500" />
                <span>Test Scanner Machine Signal</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono">USB / Wireless HID</span>
            </div>

            <p className="text-xs text-gray-500">
              Point your physical barcode scanner gun at the sample test barcode below and press the trigger:
            </p>

            {/* Test Barcode Image for user to scan */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
              <Barcode value="ANNAPURNA-MART-POS" width={220} height={44} showText={true} />
              <span className="text-[10px] font-mono text-gray-400 mt-1">Sample Test Barcode [ANNAPURNA-MART-POS]</span>
            </div>

            {/* Hidden/Focused test input */}
            <div className="relative">
              <input
                ref={testInputRef}
                type="text"
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                onKeyDown={handleTestKeyDown}
                placeholder="Click here and scan with machine to test connection..."
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (testInput.trim()) {
                    soundEngine.playScanBeep(currentSoundStyle);
                    setTestSuccess(true);
                    onScannerVerified('Manually Verified Scanner');
                    toast.success('Scanner verified!');
                  }
                }}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-gray-900 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-black"
              >
                Verify
              </button>
            </div>

            {/* Browser Direct USB Connect button */}
            <button
              type="button"
              onClick={handleConnectWebHID}
              className="w-full py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Usb className="w-3.5 h-3.5 text-blue-600" />
              <span>Direct USB Scanner Pairing (WebHID)</span>
            </button>
          </div>

          {/* Scanner Loud Sound Customization */}
          <div className="bg-orange-50/60 border border-orange-200 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-orange-600" />
                <span>Supermarket Scanner Sound Settings</span>
              </span>
              <button
                type="button"
                onClick={() => soundEngine.playScanBeep(currentSoundStyle)}
                className="flex items-center gap-1 bg-[#ea580c] hover:bg-[#c2410c] text-white px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-tight shadow-sm transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Test Loud Sound</span>
              </button>
            </div>

            {/* Sound Styles */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Select Beep Chime Style:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'supermarket_loud' as ScannerSoundStyle,
                    title: 'Supermarket Loud Ping',
                    desc: '280ms dual-harmonic ring (Default)'
                  },
                  {
                    id: 'zebra_long_beep' as ScannerSoundStyle,
                    title: 'Honeywell / Zebra Beep',
                    desc: '260ms loud industrial beep'
                  },
                  {
                    id: 'hypermarket_dual' as ScannerSoundStyle,
                    title: 'Hypermarket Dual Chime',
                    desc: '320ms rising 2-tone melodic'
                  }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSoundStyleChange(s.id);
                      soundEngine.playScanBeep(s.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      currentSoundStyle === s.id
                        ? 'bg-white border-[#ea580c] ring-2 ring-orange-400 text-gray-900 shadow-sm'
                        : 'bg-white/80 border-gray-200 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <p className="text-xs font-black leading-tight">{s.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                <span>Scanner Loudness Volume:</span>
                <span className="font-mono text-orange-600">{Math.round(currentVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={currentVolume}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  onVolumeChange(val);
                }}
                className="w-full accent-[#ea580c]"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Boosted with dynamic audio compression to cut through store ambient noise.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[11px] text-gray-500 font-medium">
            Any physical USB/Bluetooth scanner sends keyboard strokes automatically when connected.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-tight transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
