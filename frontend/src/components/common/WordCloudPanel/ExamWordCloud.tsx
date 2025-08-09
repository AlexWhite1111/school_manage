import React from 'react';
import IntelligentWordCloud, { IntelligentWordCloudProps } from '@/components/advanced/IntelligentWordCloud';

const ExamWordCloud: React.FC<IntelligentWordCloudProps> = (props) => {
  return <IntelligentWordCloud {...props} />;
};

export default ExamWordCloud;