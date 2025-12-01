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
        message.success('Оновлення завантажено! Натисніть "Встановити та перезапустити" для завершення.');
      },
      onUpdateError: (error) => {
        setDownloadingUpdate(false);
        setDownloadProgress(0);
        message.error(`Помилка оновлення: ${error.message}`);
      }
    });
  }, []);

  const handleSelectPraatPath = async () => {
    setPraatLoading(true);
    try {
      const selectedPath = await configApi.selectPraatExecutable();
      if (selectedPath) {
        setPraatPath(selectedPath);
        await configApi.setSettings({ praatPath: selectedPath });
        message.success('Шлях до Praat успішно збережено');
      }
    } catch (error) {
      console.error('Failed to select Praat path:', error);
      message.error('Помилка при виборі шляху до Praat');
    } finally {
      setPraatLoading(false);
    }
  };

  const handleClearPraatPath = async () => {
    try {
      setPraatPath("");
      await configApi.setSettings({ praatPath: "" });
      message.success('Шлях до Praat очищено');
    } catch (error) {
      console.error('Failed to clear Praat path:', error);
      message.error('Помилка при очищенні шляху до Praat');
    }
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const result = await versionsApi.checkForUpdates();
      if (result && result.updateAvailable) {
        setUpdateAvailable(true);
        setUpdateInfo(result.updateInfo);
        message.success('Доступне оновлення!');
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
        message.info('Ви використовуєте останню версію');
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      message.error('Помилка при перевірці оновлень');
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
      message.error('Помилка при завантаженні оновлення');
      setDownloadingUpdate(false);
      setDownloadProgress(0);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await versionsApi.installUpdate();
    } catch (error) {
      console.error('Failed to install update:', error);
      message.error('Помилка при встановленні оновлення');
    }
  };

  return (
    <div style={{
                margin: 24,
                padding: '6px 24px 12px',
                background: token.colorBgContainer,
              }}>
      <Title level={2}>Налаштування</Title>
      <Divider />
      
      <TabsManager />

      <Card title="Інтеграція з Praat" style={{ marginBottom: 24 }}>
        <Form layout="vertical">
          <Form.Item 
            label="Шлях до виконуваного файлу Praat"
            help="Оберіть praat.exe для відкриття аудіо файлів у Praat. Якщо не налаштовано, кнопка 'Відкрити в Praat' не буде відображатися."
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={praatPath}
                placeholder="Шлях до praat.exe не обрано..."
                readOnly
                style={{ flex: 1 }}
              />
              <Button 
                icon={<FolderOpenOutlined />}
                onClick={handleSelectPraatPath}
                loading={praatLoading}
              >
                Обрати
              </Button>
              {praatPath && (
                <Button 
                  icon={<DeleteOutlined />}
                  onClick={handleClearPraatPath}
                  danger
                >
                  Очистити
                </Button>
              )}
            </Space.Compact>
          </Form.Item>
        </Form>
        
        {praatPath && (
          <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
            <strong>Поточний шлях:</strong> {praatPath}
          </Paragraph>
        )}
      </Card>

      <PatientCards />

      <StorageLocations />

      <Card title="Оновлення додатку" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%', rowGap: 0 }}>
          <Paragraph>
            <strong>📌 Поточна версія:</strong> {currentVersion || "Завантаження..."}
            {updateInfo && updateAvailable && !updateDownloaded && (
              <span> / <strong>🆕 Доступна версія:</strong> {updateInfo.version}</span>
            )}
          </Paragraph>
          
          <Space>
            <Button 
              icon={<SyncOutlined />}
              onClick={handleCheckForUpdates}
              loading={checkingUpdate}
              disabled={downloadingUpdate || updateDownloaded}
            >
              Перевірити оновлення
            </Button>
            
            {updateInfo && updateAvailable && !updateDownloaded && (
              <Button 
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadUpdate}
                loading={downloadingUpdate}
                disabled={downloadingUpdate}
              >
                Завантажити оновлення
              </Button>
            )}
            
            {updateDownloaded && (
              <Button 
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleInstallUpdate}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Встановити та перезапустити
              </Button>
            )}
          </Space>
        </Space>
      </Card>
    </div>
  )
};

export default Settings;