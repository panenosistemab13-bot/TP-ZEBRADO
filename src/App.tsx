/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Tag, Truck, Layers, Wifi, CheckCircle2, Factory, Radio, Server } from 'lucide-react';

export default function App() {
  const [lote, setLote] = useState('TP MOC');
  const [transport, setTransport] = useState('6103141361');
  const [totalVolumes, setTotalVolumes] = useState(8);
  const [zplOutput, setZplOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isReceiverActive, setIsReceiverActive] = useState(false);
  const zplSentToPrinterHistoryMs = useRef<Record<string, number>>({});

  useEffect(() => {
    generateZPL();
  }, [lote, transport, totalVolumes]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkQueueAndPrint = async () => {
      if (!isReceiverActive) return;
      try {
        const response = await fetch('/api/fila', { cache: 'no-store' });
        if (response.status === 200) {
          const data = await response.json();
          if (data.zpl && data.zpl.length > 5) {
             printViaZebraBrowserPrint(data.zpl);
          }
        }
      } catch (error) {
        console.error("Erro ao checar fila:", error);
      }
    };

    if (isReceiverActive) {
      // Checa a fila a cada 2 segundos
      intervalId = setInterval(checkQueueAndPrint, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isReceiverActive]);

  const printViaZebraBrowserPrint = async (zpl: string) => {
    // Extensão Zebra Browser Print roda localmente (geralmente porta 9101, ou responde nativamente no endpoint local do PC)
    // O tráfego não sofre problemas de HTTPS para localhost em extensões certificadas.
    try {
      console.log("Recebido da Fila! Tentando descarregar na Zebra nativamente...");
      
      // Simulação via Fetch se integrando à API HTTP oficial do Zebra Browser Print (ex: localhost:9101)
      const zebraEndpoint = "http://127.0.0.1:9101/write";
      
      await fetch(zebraEndpoint, {
         method: 'POST',
         mode: 'no-cors', // Envia direto "fire and forget"
         body: zpl
      });
      console.log("ZPL disparado para porta 9101 (Zebra Browser Print) local!");
      
    } catch(err) {
      console.error("Zebra Browser Print Local Error:", err);
    }
  };

  const generateZPL = () => {
    const vols = Math.max(1, Math.min(999, Number(totalVolumes) || 1));
    let output = '';
    
    for (let i = 1; i <= vols; i++) {
        const seq = i.toString().padStart(2, '0');
        const total = vols.toString().padStart(2, '0');
        output += `^XA
^PW800
^LL400
^FO0,50^A0N,80,80^FB800,1,0,C^FD${lote}^FS
^FO0,160^A0N,100,100^FB800,1,0,C^FD${transport}^FS
^FO0,290^A0N,80,80^FB800,1,0,C^FD${seq}/${total}^FS
^XZ\n\n`;
    }
    
    setZplOutput(output.trim());
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(zplOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([zplOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `etiquetas_${transport}.zpl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dispararImpressaoDireta = async (codigoZplCompleto: string) => {
    try {
      // Envia o ZPL para a Fila na Nuvem (Vercel)
      const response = await fetch('/api/imprimir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zpl: codigoZplCompleto })
      });
      
      const dados = await response.json();

      if (response.ok && dados.status === 'sucesso') {
        alert(`Sucesso! Lote de etiquetas enviado para a Fila.`);
      } else {
        alert(`Erro ao enfileirar: ${dados.error}`);
      }
    } catch (error) {
      alert(`Erro ao comunicar com o servidor da fila: ${(error as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 sm:px-12 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">TP Zebrado.</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-8 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          
          {/* Controls - Left Column (5 columns wide) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Configuração da Etiqueta</h2>
                <p className="text-sm text-slate-500 mt-1">Preencha os dados do carregamento para gerar a sequência.</p>
              </div>

              <div className="space-y-5">
                {/* Lote */}
                <div>
                  <label htmlFor="lote" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Título / Lote
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="lote"
                      type="text"
                      value={lote}
                      onChange={(e) => setLote(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="Ex: TP MOC"
                    />
                  </div>
                </div>

                {/* Transport */}
                <div>
                  <label htmlFor="transport" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Número de Transporte
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Truck className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="transport"
                      type="text"
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium font-mono"
                      placeholder="Ex: 6103141361"
                    />
                  </div>
                </div>

                {/* Volumes */}
                <div>
                  <label htmlFor="volumes" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Total de Volumes (Cópias)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Layers className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="volumes"
                      type="number"
                      min="1"
                      max="999"
                      value={totalVolumes}
                      onChange={(e) => setTotalVolumes(Number(e.target.value))}
                      className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="Ex: 8"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Total a Imprimir</span>
                  </div>
                  <span className="text-base font-bold text-blue-700 px-3 py-1 bg-blue-100 rounded-md">
                    {totalVolumes} {totalVolumes === 1 ? 'etiqueta' : 'etiquetas'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Configuração de Fila</h2>
                <p className="text-sm text-slate-500 mt-1">Este navegador irá consumir a fila da nuvem e imprimir localmente.</p>
              </div>
              <div className="flex flex-col space-y-4 pt-2">
                <button
                   onClick={() => setIsReceiverActive(!isReceiverActive)}
                   className={`flex w-full items-center justify-between px-5 py-4 rounded-xl border-2 transition-all ${
                     isReceiverActive 
                     ? 'border-emerald-500 bg-emerald-50 shadow-sm' 
                     : 'border-slate-200 bg-white hover:border-slate-300'
                   }`}
                >
                   <div className="flex items-center space-x-3">
                     <div className={`p-2 rounded-lg ${isReceiverActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <Radio className={`w-5 h-5 ${isReceiverActive ? 'text-white' : 'text-slate-500'}`} />
                     </div>
                     <div className="text-left">
                        <div className={`font-bold ${isReceiverActive ? 'text-emerald-900' : 'text-slate-700'}`}>Receptor Local</div>
                        <div className={`text-xs font-semibold ${isReceiverActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                           {isReceiverActive ? 'Ativo e monitorando Fila...' : 'Pausado'}
                        </div>
                     </div>
                   </div>
                   <div className={`w-12 h-6 rounded-full flex items-center transition-colors ${isReceiverActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                       <div className={`w-4 h-4 bg-white rounded-full sm:shadow shadow-sm transition-transform ${isReceiverActive ? 'translate-x-7' : 'translate-x-1'}`} />
                   </div>
                </button>

                {isReceiverActive && (
                  <div className="bg-slate-900 rounded-xl p-4 flex items-start space-x-3 shadow-inner">
                     <Server className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                     <p className="text-xs text-slate-300 leading-relaxed font-mono">
                       Conectado via Cloud Queue. Monitorando requisições na rota /api/fila a cada 2s.<br/>Aguardando ZPL para Zebra Browser Print.
                     </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview & Output - Right Column (7 columns wide) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-slate-100/50 p-6 sm:p-10 rounded-3xl border border-slate-200 border-dashed flex-1 flex flex-col items-center justify-center relative min-h-[400px]">
              
              <div className="absolute top-6 left-6 flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pré-visualização</span>
                <span className="text-sm font-medium text-slate-500">Amostra da 1ª Etiqueta</span>
              </div>

              {/* The Label Identity */}
              <div className="relative flex flex-col items-center shadow-2xl hover:shadow-xl transition-shadow bg-white rounded-md max-w-sm w-full mt-8">
                {/* Simulated Label Top Edge */}
                <div className="absolute -top-1 left-0 right-0 h-1 bg-white border-t border-slate-300 rounded-t-sm" />
                
                <div className="w-full aspect-[2/1] border border-slate-300 flex flex-col justify-center items-center p-6 bg-white overflow-hidden relative">
                   <div className="text-center w-full space-y-2">
                      <div className="text-2xl font-bold font-sans tracking-tight text-slate-900 truncate px-2">{lote || '—'}</div>
                      <div className="text-4xl leading-none font-bold font-sans tracking-tight text-slate-900 truncate px-2">{transport || '—'}</div>
                      <div className="text-2xl font-bold font-sans tracking-tight text-slate-900 truncate px-2">
                        01 / {totalVolumes.toString().padStart(2, '0')}
                      </div>
                   </div>
                   
                   {/* Subtle texture/gradient overlay to look like real thermal paper */}
                   <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-slate-500/5 pointer-events-none"></div>
                </div>

                {/* Simulated Label Bottom Edge */}
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-white border-b border-slate-300 rounded-b-sm" />
              </div>

              {/* Actions Box */}
              <div className="mt-8 w-full max-w-sm space-y-4">
                <button
                  onClick={() => dispararImpressaoDireta(zplOutput)}
                  className="group relative flex w-full items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-all shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 font-bold text-base overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <Server className="w-6 h-6 relative z-10" />
                  <span className="relative z-10">Enviar para Fila de Impressão</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm font-medium text-slate-500">
          criado por: jefferson augusto.
        </p>
      </footer>
    </div>
  );
}

