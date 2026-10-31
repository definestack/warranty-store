import { stripHtmlToText } from './html';

describe('stripHtmlToText', () => {
  it('removes tags, leaving the text content', () => {
    expect(stripHtmlToText('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  it('turns <br> and block-level closing tags into line breaks', () => {
    const html = '<h1>Privacy Policy</h1><p>Line one<br>Line two</p><p>Second paragraph</p>';

    expect(stripHtmlToText(html)).toBe('Privacy Policy\n\nLine one\nLine two\n\nSecond paragraph');
  });

  it('drops <script> and <style> blocks entirely, including their content', () => {
    const html = '<style>body { color: red; }</style><p>Visible</p><script>alert("x")</script>';

    expect(stripHtmlToText(html)).toBe('Visible');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtmlToText('<p>Terms &amp; Conditions &mdash; &quot;important&quot;</p>')).toBe(
      'Terms & Conditions — "important"'
    );
  });

  it('collapses repeated blank lines and surrounding whitespace down to one page of text', () => {
    const html = '  <p>First</p>\n\n\n<p>  </p>\n<p>Second</p>  ';

    expect(stripHtmlToText(html)).toBe('First\n\nSecond');
  });

  it('returns an empty string for content with no text', () => {
    expect(stripHtmlToText('<html><head><title>x</title></head><body></body></html>')).toBe('');
  });
});
