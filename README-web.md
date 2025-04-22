# Tiktoken Visualizer - Web Application

An interactive web application for exploring OpenAI's tiktoken tokenization. This application provides a modern, user-friendly interface for visualizing how text is broken down into tokens by different encoders used in OpenAI's models such as GPT-4, GPT-3.5, and more.

## Features

- **Interactive Tokenization**: Encode any text and visualize the resulting tokens
- **Multiple Encoders**: Support for all of OpenAI's encoders (cl100k_base, p50k_base, etc.)
- **Special Tokens Handling**: Add and manage special tokens like `<|endoftext|>`
- **Advanced Visualizations**:
  - Text view with token highlighting
  - Block view showing individual tokens
  - Distribution chart for token frequency analysis
- **Token Information**: Detailed information about individual tokens, including byte representation
- **Statistics**: Token count, character count, and compression ratio
- **Responsive Design**: Works on desktop and mobile devices

## Installation

1. Clone this repository:
   ```
   git clone <your-repository-url>
   cd tiktoken-visualizer
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the Flask application:
   ```
   python app.py
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Usage

1. **Select an Encoder**: Choose from available encoders in the dropdown menu
2. **Enter Text**: Type or paste text in the input area
3. **Special Tokens**: Toggle the "Allow Special Tokens" switch to enable special tokens
4. **Encode/Decode**: Use the "Encode" button to tokenize text, and "Decode" to convert tokens back to text
5. **Visualize**: Click the "Visualize" button to see different visualizations of the tokens

## API Endpoints

The application provides the following API endpoints:

- `GET /api/encodings`: Get a list of all available encodings
- `POST /api/encode`: Encode text into tokens
- `POST /api/decode`: Decode tokens back to text
- `POST /api/token_info`: Get detailed information about a specific token
- `GET /api/encoding_info/<encoding_name>`: Get detailed information about a specific encoding

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Visualization**: Chart.js
- **Animations**: Animate.css
- **Tokenization**: tiktoken library by OpenAI

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [OpenAI](https://openai.com) for creating the tiktoken library
- [Chart.js](https://www.chartjs.org/) for the visualization charts
- [Animate.css](https://animate.style/) for the animations