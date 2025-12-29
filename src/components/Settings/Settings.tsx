import React, { useState, useEffect } from "react";
import { Typography, Divider, theme as antTheme, Card, message, Button, Input, Space, Form } from "antd";
import { FolderOpenOutlined, DeleteOutlined, DownloadOutlined, SyncOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import * as configApi from "../../helpers/configApi";
import * as versionsApi from "../../helpers/versionsApi";
import PatientCards from "./PatientCards/PatientCards";
import StorageLocations from "./StorageLocations/StorageLocations";
import TabsManager from "./TabsManager/TabsManager";

const { Title, Paragraph } = Typography;
const { useToken } = antTheme;

const Settings: React.FC = () => {
  const { token } = useToken();
  const { t } = useTranslation();
  
  const [praatPath, setPraatPath] = useState<string>("");
  const [praatLoading, setPraatLoading] = useState(false);
  
  // Update states
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settings, version] = await Promise.all([
          configApi.getSettings(),
          versionsApi.getAppVersion()
        ]);
        setPraatPath(settings.praatPath || "");
        setCurrentVersion(version);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setPraatPath("");
        setCurrentVersion("Unknown");
      }
    };
    loadSettings();

    // Setup update progress listeners
    versionsApi.setupUpdateListeners({
      onDownloadProgress: (progress) => {
        setDownloadProgress(Math.round(progress.percent));
      },
      onUpdateDownloaded: () => {
        setDownloadingUpdate(false);
        setUpdateDownloaded(true);
        setDownloadProgress(100);
        message.success(t('settings.updates.messages.downloaded'));
      },
      onUpdateError: (error) => {
        setDownloadingUpdate(false);
        setDownloadProgress(0);
        message.error(t('settings.updates.messages.updateError', { message: error.message }));
      }
    });
  }, [t]);

  const handleSelectPraatPath = async () => {
    setPraatLoading(true);
    try {
      const selectedPath = await configApi.selectPraatExecutable();
      if (selectedPath) {
        setPraatPath(selectedPath);
        await configApi.setSettings({ praatPath: selectedPath });
        message.success(t('settings.praat.messages.pathSaved'));
      }
    } catch (error) {
      console.error('Failed to select Praat path:', error);
      message.error(t('settings.praat.messages.pathSelectError'));
    } finally {
      setPraatLoading(false);
    }
  };

  const handleClearPraatPath = async () => {
    try {
      setPraatPath("");
      await configApi.setSettings({ praatPath: "" });
      message.success(t('settings.praat.messages.pathCleared'));
    } catch (error) {
      console.error('Failed to clear Praat path:', error);
      message.error(t('settings.praat.messages.pathClearError'));
    }
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const result = await versionsApi.checkForUpdates();
      if (result && result.updateAvailable) {
        setUpdateAvailable(true);
        setUpdateInfo(result.updateInfo);
        message.success(t('settings.updates.messages.updateAvailable'));
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
        message.info(t('settings.updates.messages.upToDate'));
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      message.error(t('settings.updates.messages.checkError'));
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setDownloadingUpdate(true);
    setDownloadProgress(0);
    setUpdateDownloaded(false);
    try {
      await versionsApi.downloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
      message.error(t('settings.updates.messages.downloadError'));
      setDownloadingUpdate(false);
      setDownloadProgress(0);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await versionsApi.installUpdate();
    } catch (error) {
      console.error('Failed to install update:', error);
      message.error(t('settings.updates.messages.installError'));
    }
  };

  return (
    <div style={{
                margin: 24,
                padding: '6px 24px 12px',
                background: token.colorBgContainer,
              }}>
      <Title level={2}>{t('settings.title')}</Title>
      <Divider />
      
      <TabsManager />

      <Card title={t('settings.praat.title')} style={{ marginBottom: 24 }}>
        <Form layout="vertical">
          <Form.Item 
            label={t('settings.praat.pathLabel')}
            help={t('settings.praat.pathHelp')}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={praatPath}
                placeholder={t('settings.praat.pathPlaceholder')}
                readOnly
                style={{ flex: 1 }}
              />
              <Button 
                icon={<FolderOpenOutlined />}
                onClick={handleSelectPraatPath}
                loading={praatLoading}
              >
                {t('common.select')}
              </Button>
              {praatPath && (
                <Button 
                  icon={<DeleteOutlined />}
                  onClick={handleClearPraatPath}
                  danger
                >
                  {t('common.clear')}
                </Button>
              )}
            </Space.Compact>
          </Form.Item>
        </Form>
        
        {praatPath && (
          <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
            <strong>{t('common.currentPath')}</strong> {praatPath}
          </Paragraph>
        )}
      </Card>

      <PatientCards />

      <StorageLocations />

      <Card title={t('settings.updates.title')} style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%', rowGap: 0 }}>
          <Paragraph>
            <strong>📌 {t('settings.updates.currentVersion')}</strong> {currentVersion || t('common.loading')}
            {updateInfo && updateAvailable && !updateDownloaded && (
              <span> / <strong>🆕 {t('settings.updates.availableVersion')}</strong> {updateInfo.version}</span>
            )}
          </Paragraph>
          
          <Space>
            <Button 
              icon={<SyncOutlined />}
              onClick={handleCheckForUpdates}
              loading={checkingUpdate}
              disabled={downloadingUpdate || updateDownloaded}
            >
              {t('settings.updates.checkUpdates')}
            </Button>
            
            {updateInfo && updateAvailable && !updateDownloaded && (
              <Button 
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadUpdate}
                loading={downloadingUpdate}
                disabled={downloadingUpdate}
              >
                {t('settings.updates.downloadUpdate')}
              </Button>
            )}
            
            {updateDownloaded && (
              <Button 
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleInstallUpdate}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                {t('settings.updates.installRestart')}
              </Button>
            )}
          </Space>
        </Space>
      </Card>
    </div>
  )
};

export default Settings;
