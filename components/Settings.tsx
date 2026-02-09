import React, { useState, useRef } from 'react';
import { Save, AlertTriangle, CheckCircle, Mail, FileText, Download, Upload, Database, FileSpreadsheet, FileJson, LayoutTemplate } from 'lucide-react';
import { AppConfig, Employee, LeaveRequest } from '../types';
import { read, utils, writeFile } from 'xlsx';

interface SettingsProps {
  config: AppConfig;
  employees?: Employee[];
  requests?: LeaveRequest[];
  onSave: (newConfig: AppConfig, applyToAll: boolean) => void;
  onImport?: (data: { employees: Employee[], requests: LeaveRequest[], config: AppConfig }) => void;
}

type TemplateTab = 'general' | 'legal' | 'admin' | 'sick';

export const Settings: React.FC<SettingsProps> = ({ config, employees = [], requests = [], onSave, onImport }) => {
  const [vacationDays, setVacationDays] = useState(config.defaultVacationDays);
  const [adminDays, setAdminDays] = useState(config.defaultAdminDays);
  const [sickLeaveDays, setSickLeaveDays] = useState(config.defaultSickLeaveDays);
  const [notificationEmail, setNotificationEmail] = useState(config.notificationEmail || 'todos@institucion.cl');
  
  // Templates State
  const [emailTemplate, setEmailTemplate] = useState(config.emailTemplate || "- {NOMBRE} ({CARGO}): {TIPO} {JORNADA} desde el {DESDE} hasta el {HASTA}.");
  const [templateLegal, setTemplateLegal] = useState(config.templateLegalHoliday || "- {NOMBRE} ({CARGO}): Hará uso de Feriado Legal {JORNADA} desde el {DESDE} hasta el {HASTA}.");
  const [templateAdmin, setTemplateAdmin] = useState(config.templateAdministrative || "- {NOMBRE} ({CARGO}): Solicitó Permiso Administrativo {JORNADA} el día {DESDE} (Retorna: {HASTA}).");
  const [templateSick, setTemplateSick] = useState(config.templateSickLeave || "- {NOMBRE} ({CARGO}): Presenta Licencia Médica desde el {DESDE} hasta el {HASTA}.");
  
  const [activeTab, setActiveTab] = useState<TemplateTab>('legal');

  const [applyToAll, setApplyToAll] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      { 
        defaultVacationDays: vacationDays, 
        defaultAdminDays: adminDays,
        defaultSickLeaveDays: sickLeaveDays,
        notificationEmail: notificationEmail,
        emailTemplate: emailTemplate,
        templateLegalHoliday: templateLegal,
        templateAdministrative: templateAdmin,
        templateSickLeave: templateSick
      },
      applyToAll
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // --- JSON HANDLERS ---
  const handleExportJSON = () => {
    const dataToExport = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      config: {
        defaultVacationDays: vacationDays,
        defaultAdminDays: adminDays,
        defaultSickLeaveDays: sickLeaveDays,
        notificationEmail,
        emailTemplate,
        templateLegalHoliday: templateLegal,
        templateAdministrative: templateAdmin,
        templateSickLeave: templateSick
      },
      employees,
      requests
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `respaldo_rrhh_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSONClick = () => {
    jsonInputRef.current?.click();
  };

  const handleFileChangeJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (onImport && (json.employees || json.requests || json.config)) {
          onImport({
            employees: json.employees || [],
            requests: json.requests || [],
            config: json.config || config
          });
          
          // Update local state if config was imported
          if (json.config) {
            setVacationDays(json.config.defaultVacationDays);
            setAdminDays(json.config.defaultAdminDays);
            setSickLeaveDays(json.config.defaultSickLeaveDays);
            setNotificationEmail(json.config.notificationEmail);
            setEmailTemplate(json.config.emailTemplate || "");
            setTemplateLegal(json.config.templateLegalHoliday || "");
            setTemplateAdmin(json.config.templateAdministrative || "");
            setTemplateSick(json.config.templateSickLeave || "");
          }

          setImportStatus('success');
          setImportMessage('Respaldo JSON restaurado correctamente.');
          setTimeout(() => setImportStatus('idle'), 3000);
        } else {
          throw new Error("Estructura JSON inválida");
        }
      } catch (err) {
        console.error("Error importing JSON", err);
        setImportStatus('error');
        setImportMessage('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- EXCEL HANDLERS ---
  const handleExportExcel = () => {
    try {
      const wb = utils.book_new();

      // Employees Sheet
      const wsEmployees = utils.json_to_sheet(employees);
      utils.book_append_sheet(wb, wsEmployees, "Funcionarios");

      // Requests Sheet
      const wsRequests = utils.json_to_sheet(requests);
      utils.book_append_sheet(wb, wsRequests, "Solicitudes");

      // Config Sheet
      const wsConfig = utils.json_to_sheet([{
        defaultVacationDays: vacationDays,
        defaultAdminDays: adminDays,
        defaultSickLeaveDays: sickLeaveDays,
        notificationEmail,
        emailTemplate,
        templateLegalHoliday: templateLegal,
        templateAdministrative: templateAdmin,
        templateSickLeave: templateSick
      }]);
      utils.book_append_sheet(wb, wsConfig, "Configuracion");

      writeFile(wb, `planilla_rrhh_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Hubo un error al generar el archivo Excel.");
    }
  };

  const handleImportExcelClick = () => {
    excelInputRef.current?.click();
  };

  const handleFileChangeExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const wb = read(data);

        const loadedEmployees = wb.Sheets["Funcionarios"] 
            ? utils.sheet_to_json(wb.Sheets["Funcionarios"]) as Employee[] 
            : [];
            
        const loadedRequests = wb.Sheets["Solicitudes"] 
            ? utils.sheet_to_json(wb.Sheets["Solicitudes"]) as LeaveRequest[] 
            : [];
            
        const loadedConfigArr = wb.Sheets["Configuracion"] 
            ? utils.sheet_to_json(wb.Sheets["Configuracion"]) as any[] 
            : [];
        
        const loadedConfig = loadedConfigArr.length > 0 ? loadedConfigArr[0] : config;

        // Basic validation: at least something must be loaded
        if (loadedEmployees.length === 0 && loadedRequests.length === 0 && loadedConfigArr.length === 0) {
             throw new Error("No se encontraron datos válidos en el Excel (hojas: Funcionarios, Solicitudes, Configuracion)");
        }

        if (onImport) {
             onImport({
                employees: loadedEmployees.length ? loadedEmployees : employees,
                requests: loadedRequests.length ? loadedRequests : requests,
                config: loadedConfig
             });
             
             if (loadedConfig) {
                setVacationDays(loadedConfig.defaultVacationDays);
                setAdminDays(loadedConfig.defaultAdminDays);
                setSickLeaveDays(loadedConfig.defaultSickLeaveDays);
                setNotificationEmail(loadedConfig.notificationEmail);
                setEmailTemplate(loadedConfig.emailTemplate || "");
                setTemplateLegal(loadedConfig.templateLegalHoliday || "");
                setTemplateAdmin(loadedConfig.templateAdministrative || "");
                setTemplateSick(loadedConfig.templateSickLeave || "");
             }

             setImportStatus('success');
             setImportMessage('Datos importados desde Excel correctamente.');
             setTimeout(() => setImportStatus('idle'), 3000);
        }
    } catch (err) {
        console.error("Error importing Excel", err);
        setImportStatus('error');
        setImportMessage('Error al leer Excel. Verifique las hojas (Funcionarios, Solicitudes).');
    }

    e.target.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-800">Configuración Institucional</h2>
        <p className="text-slate-500">Define los parámetros base para la gestión de días libres, licencias y comunicaciones.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            Reglas Generales
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Días de Feriado Legal (Anual)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={vacationDays}
                  onChange={(e) => setVacationDays(Number(e.target.value))}
                  className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <span className="absolute right-4 top-2.5 text-slate-400 text-sm">días</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Días Administrativos (Anual)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={adminDays}
                  onChange={(e) => setAdminDays(Number(e.target.value))}
                  className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <span className="absolute right-4 top-2.5 text-slate-400 text-sm">días</span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tope Referencial de Licencias Médicas (Anual)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={sickLeaveDays}
                  onChange={(e) => setSickLeaveDays(Number(e.target.value))}
                  className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <span className="absolute right-4 top-2.5 text-slate-400 text-sm">días</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 border-t border-slate-100 pt-6">
            <h4 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
              <Mail size={18} className="text-indigo-600" />
              Configuración de Reportes y Plantillas
            </h4>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email de Destino para Reportes
                </label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="ej: todos@institucion.cl"
                  className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                   Plantillas de Correo por Tipo
                </label>
                
                {/* Tabs for Templates */}
                <div className="flex border-b border-slate-200 mb-2 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('legal')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'legal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Feriado Legal
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('admin')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'admin' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Administrativo
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('sick')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'sick' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Licencia Médica
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'general' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        General / Otros
                    </button>
                </div>

                <div className="relative">
                  <textarea
                    value={
                        activeTab === 'legal' ? templateLegal :
                        activeTab === 'admin' ? templateAdmin :
                        activeTab === 'sick' ? templateSick :
                        emailTemplate
                    }
                    onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'legal') setTemplateLegal(val);
                        else if (activeTab === 'admin') setTemplateAdmin(val);
                        else if (activeTab === 'sick') setTemplateSick(val);
                        else setEmailTemplate(val);
                    }}
                    rows={4}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="Ej: - {NOMBRE}: ..."
                  />
                  <div className="absolute right-2 top-2">
                    <FileText size={16} className="text-slate-400" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  <p className="font-medium text-slate-700">Variables disponibles (se rellenan automáticamente):</p>
                  <div className="flex flex-wrap gap-2">
                    {['{NOMBRE}', '{CARGO}', '{TIPO}', '{JORNADA}', '{DESDE}', '{HASTA}', '{MOTIVO}'].map(variable => (
                      <span key={variable} className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                        {variable}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start gap-3 mt-6">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <input
                  id="applyToAll"
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="applyToAll" className="text-sm font-medium text-amber-900 cursor-pointer">
                  Actualizar funcionarios existentes
                </label>
              </div>
              <p className="text-xs text-amber-700 ml-6">
                Si marcas esta opción, se actualizará el "Total de Días" asignado a <strong>todos</strong> los funcionarios registrados.
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <div>
              {saved && (
                <span className="flex items-center gap-2 text-emerald-600 text-sm font-medium animate-fade-in">
                  <CheckCircle size={16} />
                  Configuración guardada
                </span>
              )}
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:transform active:scale-95"
            >
              <Save size={18} />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Database size={18} className="text-indigo-600" />
            Gestión de Datos
          </h3>
        </div>
        <div className="p-6 space-y-8">
            <p className="text-sm text-slate-600">
                Seleccione el método de respaldo o importación que prefiera. 
                <br/>
                <span className="text-slate-500 text-xs">Recomendación: Use <strong>JSON</strong> para respaldos completos del sistema y <strong>Excel</strong> para editar datos masivamente o generar reportes.</span>
            </p>

            {/* JSON Section */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <FileJson size={16} className="text-slate-400" />
                    Respaldo Nativo (JSON)
                </h4>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={handleExportJSON}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                    >
                        <Download size={18} />
                        Descargar Backup JSON
                    </button>
                    <div className="flex-1">
                        <input 
                            type="file" 
                            ref={jsonInputRef} 
                            onChange={handleFileChangeJSON} 
                            accept=".json" 
                            className="hidden" 
                        />
                        <button 
                            onClick={handleImportJSONClick}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                        >
                            <Upload size={18} />
                            Restaurar Backup JSON
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-100"></div>

            {/* Excel Section */}
            <div>
                 <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    Interoperabilidad (Excel)
                </h4>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={handleExportExcel}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg font-medium transition-colors group"
                    >
                        <Download size={18} className="group-hover:text-emerald-600" />
                        Exportar a Excel
                    </button>
                    <div className="flex-1">
                        <input 
                            type="file" 
                            ref={excelInputRef} 
                            onChange={handleFileChangeExcel} 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                        />
                        <button 
                            onClick={handleImportExcelClick}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 rounded-lg font-medium transition-colors group"
                        >
                            <Upload size={18} className="group-hover:text-indigo-600" />
                            Importar desde Excel
                        </button>
                    </div>
                </div>
            </div>

             <div className="mt-4 text-center h-6">
                {importStatus === 'success' && (
                    <span className="text-sm font-medium text-emerald-600 flex items-center justify-center gap-2 animate-fade-in">
                        <CheckCircle size={16} />
                        {importMessage}
                    </span>
                )}
                {importStatus === 'error' && (
                    <span className="text-sm font-medium text-rose-600 flex items-center justify-center gap-2 animate-fade-in">
                        <AlertTriangle size={16} />
                        {importMessage}
                    </span>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};