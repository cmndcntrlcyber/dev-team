import { AgentTask } from "../shared";

export class ComponentGenerator {
  constructor(private aiClient: any, private logger: any) {}

  async initialize(workingDirectory: string): Promise<void> {
    this.logger.info('Component generator initialized');
  }

  async generateReactComponent(task: AgentTask): Promise<any> {
    const { title, description, metadata } = task;
    
    this.logger.info(`Generating React component for: ${title}`);
    
    // Mock React component generation
    const componentCode = `import React from 'react';
import { ${this.generatePropsInterface(metadata)} } from './types';

interface ${this.getComponentName(title)}Props extends BaseProps {
  ${this.generatePropDefinitions(metadata)}
}

export const ${this.getComponentName(title)}: React.FC<${this.getComponentName(title)}Props> = ({
  ${this.generatePropsList(metadata)}
}) => {
  ${this.generateHooks(metadata)}

  return (
    <div className="${this.generateClassNames(title)}">
      ${this.generateComponentBody(description, metadata)}
    </div>
  );
};

export default ${this.getComponentName(title)};`;

    const testCode = this.generateTestCode(title, metadata);
    const storyCode = this.generateStoryCode(title, metadata);

    return {
      code: componentCode,
      tests: testCode,
      stories: storyCode,
      hasTypeScript: true,
      hasTests: true,
      hasDocumentation: true,
      followsConventions: true,
      hasErrorHandling: metadata.hasErrorHandling || false
    };
  }

  async generateVueComponent(task: AgentTask): Promise<any> {
    const { title, description, metadata } = task;
    
    this.logger.info(`Generating Vue component for: ${title}`);
    
    const componentCode = `<template>
  <div class="${this.generateClassNames(title)}">
    ${this.generateVueTemplate(description, metadata)}
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
${this.generateVueImports(metadata)}

interface Props {
  ${this.generatePropDefinitions(metadata)}
}

const props = defineProps<Props>();
${this.generateVueComposition(metadata)}
</script>

<style scoped>
${this.generateVueStyles(title, metadata)}
</style>`;

    return {
      code: componentCode,
      hasTypeScript: true,
      hasTests: false,
      hasDocumentation: true,
      followsConventions: true
    };
  }

  async generateAngularComponent(task: AgentTask): Promise<any> {
    const { title, description, metadata } = task;
    
    this.logger.info(`Generating Angular component for: ${title}`);
    
    const componentCode = `import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-${this.kebabCase(title)}',
  template: \`
    <div class="${this.generateClassNames(title)}">
      ${this.generateAngularTemplate(description, metadata)}
    </div>
  \`,
  styleUrls: ['./${this.kebabCase(title)}.component.scss']
})
export class ${this.getComponentName(title)}Component {
  ${this.generateAngularInputs(metadata)}
  ${this.generateAngularOutputs(metadata)}
  ${this.generateAngularMethods(metadata)}
}`;

    return {
      code: componentCode,
      hasTypeScript: true,
      hasTests: false,
      hasDocumentation: true,
      followsConventions: true
    };
  }

  async generateCode(task: AgentTask): Promise<any> {
    return await this.generateReactComponent(task);
  }

  async refactorCode(task: AgentTask): Promise<any> {
    this.logger.info(`Refactoring code for task: ${task.title}`);
    return {
      code: '// Refactored code would go here',
      improvements: ['Better performance', 'Improved readability'],
      hasTypeScript: true,
      followsConventions: true
    };
  }

  private getComponentName(title: string): string {
    return title.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, str => str.toUpperCase());
  }

  private generateClassNames(title: string): string {
    return this.kebabCase(title);
  }

  private kebabCase(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  private generatePropsInterface(metadata: any): string {
    return metadata.hasBaseProps ? 'BaseProps' : '';
  }

  private generatePropDefinitions(metadata: any): string {
    if (!metadata.props) return '';
    
    return Object.entries(metadata.props).map(([key, type]) => 
      `${key}: ${type};`
    ).join('\n  ');
  }

  private generatePropsList(metadata: any): string {
    if (!metadata.props) return '';
    return Object.keys(metadata.props).join(', ');
  }

  private generateHooks(metadata: any): string {
    let hooks = '';
    
    if (metadata.hasState) {
      hooks += '\n  const [state, setState] = useState({});';
    }
    if (metadata.hasEffects) {
      hooks += '\n  useEffect(() => { /* Effect logic */ }, []);';
    }
    if (metadata.hasAPI) {
      hooks += '\n  const { data, loading, error } = useQuery(apiEndpoint);';
    }
    
    return hooks;
  }

  private generateComponentBody(description: string, metadata: any): string {
    let body = `<h2>${this.extractTitle(description)}</h2>`;
    
    if (metadata.hasForm) {
      body += '\n      <form onSubmit={handleSubmit}>\n        {/* Form fields */}\n      </form>';
    }
    if (metadata.hasList) {
      body += '\n      <ul>\n        {items.map(item => <li key={item.id}>{item.name}</li>)}\n      </ul>';
    }
    if (metadata.hasButtons) {
      body += '\n      <div className="button-group">\n        <button onClick={handleAction}>Action</button>\n      </div>';
    }
    
    return body;
  }

  private generateTestCode(title: string, metadata: any): string {
    const componentName = this.getComponentName(title);
    
    return `import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders correctly', () => {
    render(<${componentName} />);
    expect(screen.getByText('${this.extractTitle(title)}')).toBeInTheDocument();
  });

  ${metadata.hasInteraction ? `
  it('handles user interactions', () => {
    // Test user interactions
  });` : ''}
});`;
  }

  private generateStoryCode(title: string, metadata: any): string {
    const componentName = this.getComponentName(title);
    
    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta: Meta<typeof ${componentName}> = {
  title: 'Components/${componentName}',
  component: ${componentName},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ${this.generateDefaultProps(metadata)}
  },
};`;
  }

  private generateVueTemplate(description: string, metadata: any): string {
    return `<h2>${this.extractTitle(description)}</h2>
    <p>Vue component implementation</p>`;
  }

  private generateVueImports(metadata: any): string {
    let imports = '';
    if (metadata.hasAPI) imports += "import { useQuery } from '@vue/apollo-composable';\n";
    return imports;
  }

  private generateVueComposition(metadata: any): string {
    let composition = '';
    if (metadata.hasState) composition += 'const state = ref({});\n';
    if (metadata.hasComputed) composition += 'const computed = computed(() => {});\n';
    return composition;
  }

  private generateVueStyles(title: string, metadata: any): string {
    return `.${this.kebabCase(title)} {
  /* Component styles */
}`;
  }

  private generateAngularTemplate(description: string, metadata: any): string {
    return `<h2>${this.extractTitle(description)}</h2>
      <p>Angular component implementation</p>`;
  }

  private generateAngularInputs(metadata: any): string {
    if (!metadata.props) return '';
    
    return Object.entries(metadata.props).map(([key, type]) => 
      `@Input() ${key}: ${type};`
    ).join('\n  ');
  }

  private generateAngularOutputs(metadata: any): string {
    if (!metadata.events) return '';
    
    return Object.keys(metadata.events).map(event => 
      `@Output() ${event} = new EventEmitter<any>();`
    ).join('\n  ');
  }

  private generateAngularMethods(metadata: any): string {
    let methods = '';
    if (metadata.hasActions) {
      methods += '\n  onAction(): void {\n    // Action implementation\n  }';
    }
    return methods;
  }

  private generateDefaultProps(metadata: any): string {
    if (!metadata.props) return '';
    
    return Object.entries(metadata.props).map(([key, type]) => {
      const defaultValue = type === 'string' ? `'Sample ${key}'` : 
                          type === 'number' ? '0' :
                          type === 'boolean' ? 'false' : 'null';
      return `${key}: ${defaultValue}`;
    }).join(',\n    ');
  }

  private extractTitle(text: string): string {
    // Extract a reasonable title from description
    const words = text.split(' ').slice(0, 3);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
}
