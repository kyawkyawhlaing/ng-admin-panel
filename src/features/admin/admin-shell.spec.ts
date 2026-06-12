import { TestBed } from '@angular/core/testing';
import { AdminShell } from './admin-shell';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

describe('AdminShell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminShell],
      providers: [
        provideRouter([]),
        provideNoopAnimations()
      ]
    }).compileComponents();
  });

  it('should create the admin shell component', () => {
    const fixture = TestBed.createComponent(AdminShell);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display the sidebar links', () => {
    const fixture = TestBed.createComponent(AdminShell);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('nav a');
    expect(links.length).toBe(5);
    expect(links[0].textContent).toContain('Dashboard');
    expect(links[1].textContent).toContain('Users');
  });

  it('should toggle sidebar state when button is clicked', () => {
    const fixture = TestBed.createComponent(AdminShell);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    
    // Check initial state
    expect(component['isCollapsed']()).toBe(false);
    
    const button = fixture.debugElement.query(By.css('header button[aria-label="Toggle navigation menu"]'));
    expect(button).toBeTruthy();
    
    button.nativeElement.click();
    fixture.detectChanges();
    
    // Check if toggled (on desktop mock environment, isMobile is false)
    expect(component['isCollapsed']()).toBe(true);
  });
});
