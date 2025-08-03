import React from "react";
import { Typography, Divider } from "antd";

const { Title, Paragraph } = Typography;

const Settings: React.FC = () => (
  <div>
    <Title level={2}>Settings</Title>
    <Divider />
    <Paragraph type="secondary">
      Configuration options will appear here.  
      You can safely scaffold new forms or switches inside this component.
    </Paragraph>
  </div>
);

export default Settings;
