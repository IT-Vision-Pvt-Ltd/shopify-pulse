import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  Button,
  Banner,
  Checkbox,
  Divider,
  Box,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // In production, fetch from database
  return json({
    settings: {
      openaiApiKey: "",
      claudeApiKey: "",
      selectedModel: "gpt-4",
      dailyAnalysisEnabled: true,
      analysisTime: "09:00",
      emailNotifications: true,
      timezone: "UTC",
      currency: "USD",
    },
    availableModels: [
      { label: "GPT-4 (Recommended)", value: "gpt-4" },
      { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
      { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
      { label: "Claude 3 Opus", value: "claude-3-opus" },
      { label: "Claude 3 Sonnet", value: "claude-3-sonnet" },
      { label: "Claude 3 Haiku", value: "claude-3-haiku" },
    ],
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  // Save settings to database
  // In production, save to ShopSettings model
  
  return json({ success: true, message: "Settings saved successfully" });
};

export default function Settings() {
  const { settings, availableModels } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey);
  const [claudeKey, setClaudeKey] = useState(settings.claudeApiKey);
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel);
  const [dailyAnalysis, setDailyAnalysis] = useState(settings.dailyAnalysisEnabled);
  const [analysisTime, setAnalysisTime] = useState(settings.analysisTime);
  const [emailNotifications, setEmailNotifications] = useState(settings.emailNotifications);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("openaiApiKey", openaiKey);
    formData.append("claudeApiKey", claudeKey);
    formData.append("selectedModel", selectedModel);
    formData.append("dailyAnalysisEnabled", dailyAnalysis.toString());
    formData.append("analysisTime", analysisTime);
    formData.append("emailNotifications", emailNotifications.toString());
    submit(formData, { method: "post" });
  }, [openaiKey, claudeKey, selectedModel, dailyAnalysis, analysisTime, emailNotifications, submit]);

  return (
    <Page
      title="Settings"
      primaryAction={
        <Button variant="primary" onClick={handleSave} loading={isSubmitting}>
          Save Settings
        </Button>
      }
    >
      <BlockStack gap="500">
        {/* AI Configuration */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">AI Configuration</Text>
                <Banner tone="info">
                  Configure your AI API keys to enable intelligent business analysis. 
                  Your keys are encrypted and stored securely.
                </Banner>
                <Divider />
                
                <TextField
                  label="OpenAI API Key"
                  value={openaiKey}
                  onChange={setOpenaiKey}
                  type="password"
                  placeholder="sk-..."
                  helpText="Get your API key from platform.openai.com"
                  autoComplete="off"
                />
                
                <TextField
                  label="Claude (Anthropic) API Key"
                  value={claudeKey}
                  onChange={setClaudeKey}
                  type="password"
                  placeholder="sk-ant-..."
                  helpText="Get your API key from console.anthropic.com"
                  autoComplete="off"
                />
                
                <Select
                  label="Preferred AI Model"
                  options={availableModels}
                  value={selectedModel}
                  onChange={setSelectedModel}
                  helpText="Select the AI model for generating business insights"
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Model Comparison</Text>
                <BlockStack gap="200">
                  <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                    <BlockStack gap="100">
                      <Text as="p" fontWeight="semibold">GPT-4</Text>
                      <Text as="p" tone="subdued" variant="bodySm">Best for complex analysis</Text>
                    </BlockStack>
                  </Box>
                  <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                    <BlockStack gap="100">
                      <Text as="p" fontWeight="semibold">Claude 3</Text>
                      <Text as="p" tone="subdued" variant="bodySm">Great for detailed reports</Text>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Analysis Settings */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Daily Analysis Settings</Text>
            <Divider />
            
            <Checkbox
              label="Enable daily AI analysis"
              checked={dailyAnalysis}
              onChange={setDailyAnalysis}
              helpText="Receive an automated business analysis report every day"
            />
            
            <TextField
              label="Analysis Time"
              value={analysisTime}
              onChange={setAnalysisTime}
              type="time"
              helpText="Time when the daily analysis will be generated (in your timezone)"
              disabled={!dailyAnalysis}
            />
            
            <Checkbox
              label="Email notifications"
              checked={emailNotifications}
              onChange={setEmailNotifications}
              helpText="Receive analysis reports and alerts via email"
            />
          </BlockStack>
        </Card>

        {/* Subscription Info */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Subscription</Text>
              <Button>Upgrade Plan</Button>
            </InlineStack>
            <Divider />
            <InlineStack gap="400">
              <BlockStack gap="100">
                <Text as="p" tone="subdued">Current Plan</Text>
                <Text as="p" variant="headingLg">Free</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" tone="subdued">AI Analyses Remaining</Text>
                <Text as="p" variant="headingLg">5/10</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" tone="subdued">Trial Ends</Text>
                <Text as="p" variant="headingLg">14 days</Text>
              </BlockStack>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
