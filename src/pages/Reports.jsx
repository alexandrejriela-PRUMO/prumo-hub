import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, BarChart3 } from 'lucide-react';
import ReportBuilder from '../components/reports/ReportBuilder';
import ReportPreview from '../components/reports/ReportPreview';
import SavedReports from '../components/reports/SavedReports';

export default function Reports() {
  const [user, setUser] = useState(null);
  const [reportConfig, setReportConfig] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('builder');
  const [editingReport, setEditingReport] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const handleLoadReport = (config) => {
    generateReport(config);
  };

  const handleEditReport = (report) => {
    setEditingReport(report);
    setActiveTab('builder');
  };

  const generateReport = async (config) => {
    const data = {
      properties: [],
      licenses: [],
      alerts: [],
      documents: [],
      processes: [],
      invoices: []
    };

    // Fetch selected data sources
    if (config.dataSources.includes('properties')) {
      let properties = await base44.entities.Property.filter({ owner_email: user.email });
      if (config.propertyId) {
        properties = properties.filter(p => p.id === config.propertyId);
      }
      data.properties = properties;
    }

    if (config.dataSources.includes('licenses')) {
      let licenses = await base44.entities.License.filter({ owner_email: user.email });
      if (config.propertyId) {
        licenses = licenses.filter(l => l.property_id === config.propertyId);
      }
      if (config.dateRange.start) {
        licenses = licenses.filter(l => 
          new Date(l.issue_date) >= new Date(config.dateRange.start)
        );
      }
      if (config.dateRange.end) {
        licenses = licenses.filter(l => 
          new Date(l.issue_date) <= new Date(config.dateRange.end)
        );
      }
      if (config.status) {
        licenses = licenses.filter(l => l.status === config.status);
      }
      data.licenses = licenses;
    }

    if (config.dataSources.includes('alerts')) {
      let alerts = await base44.entities.EnvironmentalAlert.list();
      if (config.propertyId) {
        alerts = alerts.filter(a => a.property_id === config.propertyId);
      }
      if (config.dateRange.start) {
        alerts = alerts.filter(a => 
          new Date(a.detection_date) >= new Date(config.dateRange.start)
        );
      }
      if (config.dateRange.end) {
        alerts = alerts.filter(a => 
          new Date(a.detection_date) <= new Date(config.dateRange.end)
        );
      }
      if (config.severity) {
        alerts = alerts.filter(a => a.severity === config.severity);
      }
      if (config.status) {
        alerts = alerts.filter(a => a.status === config.status);
      }
      data.alerts = alerts;
    }

    if (config.dataSources.includes('documents')) {
      let documents = await base44.entities.Document.filter({ owner_email: user.email });
      if (config.propertyId) {
        documents = documents.filter(d => d.property_id === config.propertyId);
      }
      data.documents = documents;
    }

    if (config.dataSources.includes('processes')) {
      let processes = await base44.entities.Process.filter({ client_email: user.email });
      if (config.dateRange.start) {
        processes = processes.filter(p => 
          new Date(p.filing_date) >= new Date(config.dateRange.start)
        );
      }
      if (config.dateRange.end) {
        processes = processes.filter(p => 
          new Date(p.filing_date) <= new Date(config.dateRange.end)
        );
      }
      if (config.status) {
        processes = processes.filter(p => p.status === config.status);
      }
      data.processes = processes;
    }

    if (config.dataSources.includes('invoices')) {
      let invoices = await base44.entities.Invoice.filter({ client_email: user.email });
      if (config.dateRange.start) {
        invoices = invoices.filter(i => 
          new Date(i.due_date) >= new Date(config.dateRange.start)
        );
      }
      if (config.dateRange.end) {
        invoices = invoices.filter(i => 
          new Date(i.due_date) <= new Date(config.dateRange.end)
        );
      }
      if (config.status) {
        invoices = invoices.filter(i => i.status === config.status);
      }
      data.invoices = invoices;
    }

    setReportData(data);
    setReportConfig(config);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 mt-1">Gere relatórios personalizados e exporte seus dados</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'builder'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Criar Relatório
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'saved'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Relatórios Salvos
            </button>
          </div>
        </div>

        {activeTab === 'builder' && (
          <div className="space-y-6">
            <ReportBuilder
              user={user}
              onGenerate={generateReport}
              editingReport={editingReport}
              onCancelEdit={() => setEditingReport(null)}
            />

            {reportData && reportConfig && (
              <ReportPreview
                data={reportData}
                config={reportConfig}
                user={user}
              />
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedReports 
            user={user}
            onLoadReport={handleLoadReport}
            onEditReport={handleEditReport}
          />
        )}
      </div>
    </div>
  );
}