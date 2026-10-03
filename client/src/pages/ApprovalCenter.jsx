import React from 'react';
import { ApprovalCenter } from '../components/approvals/ApprovalCenter.jsx';

export function ApprovalCenterPage({ dashboard, onDecision, busy }) {
  return (
    <ApprovalCenter
      actions={dashboard?.actions || []}
      onDecision={onDecision}
      busy={busy}
      emergencyStop={Boolean(dashboard?.emergency_stop)}
    />
  );
}

export default ApprovalCenterPage;

