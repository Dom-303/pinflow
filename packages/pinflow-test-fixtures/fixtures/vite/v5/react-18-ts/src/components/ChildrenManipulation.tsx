/**
 * ChildrenManipulation - Tests React.Children utilities and cloneElement
 *
 * Validates that PinFlow handles:
 * - React.Children.map/forEach
 * - React.cloneElement
 * - Children as function pattern
 * - Complex children manipulation
 */

import {
  Children,
  cloneElement,
  isValidElement,
  ReactNode,
  ReactElement,
} from 'react';
import { CaptureIcon } from './CaptureIcon';

interface WrapperProps {
  children: ReactNode;
}

function ChildrenMapWrapper({ children }: WrapperProps) {
  return (
    <div className="children-map-wrapper">
      {Children.map(children, (child, index) => (
        <div className="child-container list-group" key={index}>
          <span className="child-index">#{index + 1}</span>
          {child}
        </div>
      ))}
    </div>
  );
}

interface CloneProps {
  children: ReactElement;
}

function CloneWithProps({ children }: CloneProps) {
  return (
    <div className="clone-with-props">
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          return cloneElement(child, {
            // @ts-expect-error - Adding props dynamically
            className: `${child.props.className || ''} cloned-child`,
            'data-cloned': 'true',
          });
        }
        return child;
      })}
    </div>
  );
}

interface ChildCounterProps {
  children: ReactNode;
}

function ChildCounter({ children }: ChildCounterProps) {
  const count = Children.count(children);

  return (
    <div className="child-counter">
      <p>Anzahl der Children: {count}</p>
      {children}
    </div>
  );
}

interface OnlyChildProps {
  children: ReactNode;
}

function OnlyChild({ children }: OnlyChildProps) {
  const onlyChild = Children.only(children);

  return (
    <div className="only-child">
      <p>Diese Komponente akzeptiert genau ein Child:</p>
      {onlyChild}
    </div>
  );
}

interface ListWithSeparatorProps {
  children: ReactNode;
  separator?: ReactNode;
}

function ListWithSeparator({
  children,
  separator = ', ',
}: ListWithSeparatorProps) {
  const childrenArray = Children.toArray(children);

  return (
    <div className="list-with-separator">
      {childrenArray.map((child, index) => (
        <span key={index}>
          {child}
          {index < childrenArray.length - 1 && separator}
        </span>
      ))}
    </div>
  );
}

interface EnhancerProps {
  children: ReactNode;
  enhance?: boolean;
}

function ChildrenEnhancer({ children, enhance = true }: EnhancerProps) {
  if (!enhance) return <>{children}</>;

  return (
    <div className="list-group">
      {Children.map(children, (child) => {
        if (isValidElement(child) && child.type === 'button') {
          return cloneElement(child, {
            onClick: () => console.log('Erweiterter Button wurde geklickt'),
            className: `${child.props.className || ''} enhanced-button`,
          });
        }
        return child;
      })}
    </div>
  );
}

export function ChildrenManipulation() {
  return (
    <div className="children-manipulation">
      <section>
        <h4>Children.map</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ChildrenMapWrapper>
            <div>Erstes Child</div>
            <div>Zweites Child</div>
            <div>Drittes Child</div>
          </ChildrenMapWrapper>
        </div>
      </section>

      <section>
        <h4>cloneElement</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <CloneWithProps>
            <div className="original">Originalelement</div>
          </CloneWithProps>
        </div>
      </section>

      <section>
        <h4>Children.count</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ChildCounter>
            <p>Child 1</p>
            <p>Child 2</p>
            <p>Child 3</p>
          </ChildCounter>
        </div>
      </section>

      <section>
        <h4>Children.only</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <OnlyChild>
            <div>Das ist das einzige Child</div>
          </OnlyChild>
        </div>
      </section>

      <section>
        <h4>List with Separator</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <ListWithSeparator separator=" | ">
            <span>Eintrag 1</span>
            <span>Eintrag 2</span>
            <span>Eintrag 3</span>
            <span>Eintrag 4</span>
          </ListWithSeparator>
        </div>
      </section>

      <section>
        <h4>Buttons gezielt erweitern</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <p>Normales div</p>
          <ChildrenEnhancer enhance={true}>
            <div>Normales div</div>
            <button>Wird erweitert</button>
            <span>Normales span</span>
            <button>Noch ein erweiterter Button</button>
          </ChildrenEnhancer>
        </div>
      </section>
    </div>
  );
}
