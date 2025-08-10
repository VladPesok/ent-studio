import React, { useState, useEffect } from "react";
import { Typography, Divider, theme as antTheme, Form, Select, Card, message } from "antd";
import { useTranslation } from 'react-i18next';
import * as configApi from "../../helpers/configApi";

const { Title, Paragraph } = Typography;
const { useToken } = antTheme;

const Settings: React.FC = () => {
  const { token } = useToken();
  const { t } = useTranslation();
  
  const [shownTabs, setShownTabs] = useState<configApi.TabEntry[]>(configApi.getDefaultTabs());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShownTabs = async () => {
      try {
        const tabs = await configApi.getShownTabs();
        setShownTabs(Array.isArray(tabs) ? tabs : configApi.getDefaultTabs());
      } catch (error) {
        console.error('Failed to load shown tabs:', error);
        setShownTabs(configApi.getDefaultTabs());
      } finally {
        setLoading(false);
      }
    };
    loadShownTabs();
  }, []);

  const handleTabsChange = async (values: string[]) => {
    if (!Array.isArray(values)) {
      console.error('Invalid values provided to handleTabsChange:', values);
      return;
    }
    
    const currentTabs = Array.isArray(shownTabs) ? shownTabs : configApi.getDefaultTabs();
    const defaultTabs = configApi.getDefaultTabs();
    
    const newTabs: configApi.TabEntry[] = values.map(value => {
      // Check if it's a default tab (by folder name or translated name)
      const defaultTab = defaultTabs.find(tab => 
        tab.folder === value || t(tab.folder) === value
      );
      
      if (defaultTab) {
        return defaultTab; // Return default tab without name property
      }
      
      // Check if it's an existing custom tab
      const existingTab = currentTabs.find(tab => 
        (tab.name === value) || 
        (tab.folder === value)
      );
      
      if (existingTab) {
        return existingTab;
      }
      
      // Create new custom tab
      return {
        name: value,
        folder: configApi.createFolderName(value)
      };
    });
    
    setShownTabs(newTabs);
    try {
      await configApi.setShownTabs(newTabs);
    } catch (error) {
      console.error('Failed to save shown tabs:', error);
    }
  };

  const defaultTabs = configApi.getDefaultTabs() || [];
  const currentShownTabs = Array.isArray(shownTabs) ? shownTabs : [];
  
  const allTabOptions = [
    ...defaultTabs.map(tab => ({
      label: t(tab.folder),
      value: t(tab.folder)
    })),
    ...currentShownTabs
      .filter(tab => !defaultTabs.some(dt => dt.folder === tab.folder))
      .map(tab => ({
        label: tab.name || tab.folder,
        value: tab.name || tab.folder
      }))
  ];

  return (
    <div style={{
                margin: 24,
                padding: '6px 24px 12px',
                background: token.colorBgContainer,
              }}>
      <Title level={2}>Налаштування</Title>
      <Divider />
      
      <Card title="Відображувані вкладки" style={{ marginBottom: 24 }}>
        <Form layout="vertical">
          <Form.Item 
            label="Оберіть або створіть вкладки для відображення"
            help="Ви можете обрати існуючі вкладки або створити нові, ввівши їх назву"
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Оберіть або введіть назву вкладки..."
              value={currentShownTabs.map(tab => {
                // For default tabs, use translated name
                if (defaultTabs.some(dt => dt.folder === tab.folder)) {
                  return t(tab.folder);
                }
                // For custom tabs, use the name property
                return tab.name || tab.folder;
              })}
              onChange={handleTabsChange}
              options={allTabOptions}
              loading={loading}
              tokenSeparators={[',']}
            />
          </Form.Item>
        </Form>
        
        <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          <strong>Стандартні вкладки:</strong> {defaultTabs.map(tab => t(tab.folder)).join(', ')}
        </Paragraph>
      </Card>
    </div>
  )
};

export default Settings;